import QRCode from 'qrcode';
export const qrMatrix=value=>QRCode.create(value,{errorCorrectionLevel:'M'}).modules;
