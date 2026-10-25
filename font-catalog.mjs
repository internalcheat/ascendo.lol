export const FONT_GROUPS=Object.freeze({
  'Sans serif':{'dm-sans':'DM Sans',inter:'Inter','space-grotesk':'Space Grotesk',sora:'Sora',outfit:'Outfit',manrope:'Manrope','plus-jakarta-sans':'Plus Jakarta Sans',poppins:'Poppins',montserrat:'Montserrat',rubik:'Rubik',raleway:'Raleway',lato:'Lato','open-sans':'Open Sans',oswald:'Oswald','bebas-neue':'Bebas Neue',anton:'Anton','barlow-condensed':'Barlow Condensed'},
  Serif:{'playfair-display':'Playfair Display',cinzel:'Cinzel','libre-baskerville':'Libre Baskerville','cormorant-garamond':'Cormorant Garamond','bodoni-moda':'Bodoni Moda','abril-fatface':'Abril Fatface','dm-serif-display':'DM Serif Display'},
  Monospace:{'jetbrains-mono':'JetBrains Mono','space-mono':'Space Mono','ibm-plex-mono':'IBM Plex Mono','fira-code':'Fira Code'},
  Gothic:{unifrakturcook:'UnifrakturCook',unifrakturmaguntia:'UnifrakturMaguntia','pirata-one':'Pirata One','grenze-gotisch':'Grenze Gotisch'},
  Bubbly:{nunito:'Nunito',quicksand:'Quicksand','bowlby-one-sc':'Bowlby One SC','baloo-2':'Baloo 2',fredoka:'Fredoka','lilita-one':'Lilita One'}
});
export const FONTS=Object.freeze(Object.assign({},...Object.values(FONT_GROUPS)));
