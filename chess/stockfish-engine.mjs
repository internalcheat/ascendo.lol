const aborted=()=>new DOMException('Search cancelled.','AbortError');
export class StockfishEngine {
  constructor({workerFactory=()=>new Worker(new URL('./vendor/stockfish/stockfish-19-lite-single.js',import.meta.url)),startupTimeout=15000,searchTimeout=5000}={}){
    this.workerFactory=workerFactory;this.startupTimeout=startupTimeout;this.searchTimeout=searchTimeout;
    this.worker=null;this.starting=null;this.waiters=new Set();this.queue=Promise.resolve();this.epoch=0;this.closed=false;this.searching=false;
  }
  line(value){for(const line of String(value).split(/\r?\n/)){for(const waiter of [...this.waiters])if(waiter.match(line)){clearTimeout(waiter.timer);this.waiters.delete(waiter);waiter.resolve(line);}}}
  wait(match,timeout){return new Promise((resolve,reject)=>{const waiter={match,resolve,reject};waiter.timer=setTimeout(()=>{this.waiters.delete(waiter);reject(Error('The bot took too long to respond. Retry to continue.'));},timeout);this.waiters.add(waiter);});}
  fail(error){for(const waiter of this.waiters){clearTimeout(waiter.timer);waiter.reject(error);}this.waiters.clear();this.worker?.terminate();this.worker=null;this.starting=null;this.searching=false;}
  init(){
    if(this.closed)return Promise.reject(aborted());
    if(this.starting)return this.starting;
    this.starting=(async()=>{
      try{
        this.worker=this.workerFactory();this.worker.onmessage=event=>this.line(event.data);
        this.worker.onerror=event=>{event.preventDefault?.();this.fail(Error('The bot could not start. Retry to continue.'));};
        let ready=this.wait(line=>line==='uciok',this.startupTimeout);this.worker.postMessage('uci');await ready;
        if(this.closed)throw aborted();
        this.worker.postMessage('setoption name Hash value 16');this.worker.postMessage('setoption name Ponder value false');
        ready=this.wait(line=>line==='readyok',this.startupTimeout);this.worker.postMessage('isready');await ready;
      }catch(error){this.fail(error);throw error;}
    })();return this.starting;
  }
  search(moves,{skill=8,milliseconds=750}={}){
    const epoch=this.epoch;
    const work=async()=>{
      if(this.closed||epoch!==this.epoch)throw aborted();await this.init();if(epoch!==this.epoch||this.closed)throw aborted();
      this.worker.postMessage('setoption name UCI_LimitStrength value false');this.worker.postMessage(`setoption name Skill Level value ${skill}`);
      this.worker.postMessage(`position startpos${moves.length?' moves '+moves.join(' '):''}`);
      const result=this.wait(line=>line.startsWith('bestmove '),this.searchTimeout);this.searching=true;this.worker.postMessage(`go movetime ${milliseconds}`);
      let line;try{line=await result;}catch(error){this.fail(error);throw error;}finally{this.searching=false;}
      if(epoch!==this.epoch||this.closed)throw aborted();
      const move=line.split(/\s+/)[1];if(!/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(move))throw Error('The bot returned an unavailable move. Retry to continue.');
      return move;
    };
    const result=this.queue.then(work);this.queue=result.catch(()=>{});return result;
  }
  cancel(){this.epoch++;if(this.searching)this.worker?.postMessage('stop');}
  destroy(){this.closed=true;this.epoch++;this.fail(aborted());}
}
