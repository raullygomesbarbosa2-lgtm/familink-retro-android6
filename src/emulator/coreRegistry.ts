export type ConsoleId =
  | 'nes'
  | 'fds'
  | 'snes'
  | 'gb'
  | 'gbc'
  | 'gba'
  | 'vb'
  | 'gw'
  | 'megadrive'
  | 'sega32x'
  | 'segacd'
  | 'mastersystem'
  | 'gamegear'
  | 'sg1000'
  | 'pce'
  | 'ngp'
  | 'arcade'
  | 'arcade2000'
  | 'arcade2003'
  | 'arcade2003plus'
  | 'arcade2010'
  | 'arcade2013'
  | 'arcade2013plus'
  | 'neogeo'
  | 'lynx'
  | 'wonderswan'
  | 'colecovision'
  | 'vectrex'
  | 'odyssey2'
  | 'channelf'
  | '3do'
  | 'c64'
  | 'pc88'
  | 'sharpx1'
  | 'thomson'
  | 'p2000'
  | 'mac'
  | 'bk'
  | 'galaksija'
  | 'pico8'
  | 'tic80'
  | 'wasm4'
  | 'arduboy'
  | 'uzebox'
  | 'doom';

export type ManufacturerName =
  | 'Nintendo'
  | 'Sega'
  | 'NEC'
  | 'SNK / Arcade'
  | 'Atari'
  | 'Bandai / Clássicos'
  | 'Computadores';

export interface RomSourceLink {
  label: string;
  url: string;
  description: string;
}

export interface ConsoleCoreSpec {
  id: ConsoleId;
  name: string;
  shortName: string;
  manufacturer: ManufacturerName;
  year: number;
  extensions: string[];
  webCore: string;
  altWebCores: string[];
  usesJsNesDirect?: boolean;
  androidCoreSo: string;
  androidCoreDownloadUrl: string;
  aspectRatio: string;
  romSources: RomSourceLink[];
}

export const SONY_BLOCKED_EXTENSIONS = ['.pbp', '.cso', '.iso', '.ecm', '.mdf', '.psx', '.vpk'];

export const CLASSIC_CONSOLE_CORES: ConsoleCoreSpec[] = [
  // ================= NINTENDO =================
  {
    id: 'nes',
    name: 'Nintendo Entertainment System (NES / Famicom)',
    shortName: 'NES / Famicom',
    manufacturer: 'Nintendo',
    year: 1983,
    extensions: ['.nes'],
    webCore: 'jsnes',
    altWebCores: ['jsnes', 'fceumm', 'nestopia', 'quicknes'],
    usesJsNesDirect: true,
    androidCoreSo: 'fceumm_libretro_android.so',
    androidCoreDownloadUrl: 'https://buildbot.libretro.com/nightly/android/latest/arm64-v8a/fceumm_libretro_android.so.zip',
    aspectRatio: '4:3',
    romSources: [
      { label: 'Homebrew NES (itch.io)', url: 'https://itch.io/games/tag-nes', description: 'Jogos independentes e ROMs .nes gratuitas.' },
      { label: 'NESDev / PDROMs (Archive)', url: 'https://archive.org/search?query=nes+homebrew+rom', description: 'Acervo público de ROMs NES homebrew.' },
    ],
  },
  {
    id: 'fds',
    name: 'Famicom Disk System',
    shortName: 'Famicom Disk System',
    manufacturer: 'Nintendo',
    year: 1986,
    extensions: ['.fds'],
    webCore: 'nestopia',
    altWebCores: ['nestopia', 'fceumm'],
    androidCoreSo: 'nestopia_libretro_android.so',
    androidCoreDownloadUrl: 'https://buildbot.libretro.com/nightly/android/latest/arm64-v8a/nestopia_libretro_android.so.zip',
    aspectRatio: '4:3',
    romSources: [
      { label: 'FDS Homebrew (Archive)', url: 'https://archive.org/search?query=famicom+disk+system+homebrew', description: 'Discos .fds gratuitos da cena FDS.' },
    ],
  },
  {
    id: 'snes',
    name: 'Super Nintendo (SNES / Super Famicom)',
    shortName: 'Super Nintendo',
    manufacturer: 'Nintendo',
    year: 1990,
    extensions: ['.sfc', '.smc'],
    webCore: 'snes9x',
    altWebCores: ['snes9x', 'snes9x2010', 'snes9x2005', 'snes9x2002'],
    androidCoreSo: 'snes9x_libretro_android.so',
    androidCoreDownloadUrl: 'https://buildbot.libretro.com/nightly/android/latest/arm64-v8a/snes9x_libretro_android.so.zip',
    aspectRatio: '4:3',
    romSources: [
      { label: 'Homebrew SNES (itch.io)', url: 'https://itch.io/games/tag-snes', description: 'Cartuchos .sfc / .smc gratuitos da comunidade.' },
      { label: 'SNES Public Domain (Archive)', url: 'https://archive.org/search?query=snes+homebrew+rom', description: 'Demos e jogos em domínio público para Snes9x.' },
    ],
  },
  {
    id: 'gb',
    name: 'Nintendo Game Boy',
    shortName: 'Game Boy',
    manufacturer: 'Nintendo',
    year: 1989,
    extensions: ['.gb'],
    webCore: 'gambatte',
    altWebCores: ['gambatte', 'gearboy', 'tgbdual', 'DoubleCherryGB', 'mgba'],
    androidCoreSo: 'gambatte_libretro_android.so',
    androidCoreDownloadUrl: 'https://buildbot.libretro.com/nightly/android/latest/arm64-v8a/gambatte_libretro_android.so.zip',
    aspectRatio: '10:9',
    romSources: [
      { label: 'Homebrew Hub (Game Boy)', url: 'https://hh.gbdev.io/', description: 'Maior biblioteca aberta de ROMs .gb oficiais da cena GBDev.' },
      { label: 'GB Studio / itch.io', url: 'https://itch.io/games/tag-gameboy-rom', description: 'Centenas de jogos .gb gratuitos com download direto.' },
    ],
  },
  {
    id: 'gbc',
    name: 'Nintendo Game Boy Color',
    shortName: 'Game Boy Color',
    manufacturer: 'Nintendo',
    year: 1998,
    extensions: ['.gbc'],
    webCore: 'gambatte',
    altWebCores: ['gambatte', 'gearboy', 'tgbdual', 'DoubleCherryGB', 'mgba'],
    androidCoreSo: 'gambatte_libretro_android.so',
    androidCoreDownloadUrl: 'https://buildbot.libretro.com/nightly/android/latest/arm64-v8a/gambatte_libretro_android.so.zip',
    aspectRatio: '10:9',
    romSources: [
      { label: 'Homebrew Hub (GBC)', url: 'https://hh.gbdev.io/games?platform=GBC', description: 'ROMs .gbc coloridas gratuitas prontas para Gambatte/mGBA.' },
      { label: 'Game Boy Color (itch.io)', url: 'https://itch.io/games/tag-game-boy-color', description: 'Lançamentos indie para Game Boy Color em .gbc.' },
    ],
  },
  {
    id: 'gba',
    name: 'Nintendo Game Boy Advance',
    shortName: 'Game Boy Advance',
    manufacturer: 'Nintendo',
    year: 2001,
    extensions: ['.gba'],
    webCore: 'mgba',
    altWebCores: ['mgba', 'vba_next'],
    androidCoreSo: 'mgba_libretro_android.so',
    androidCoreDownloadUrl: 'https://buildbot.libretro.com/nightly/android/latest/arm64-v8a/mgba_libretro_android.so.zip',
    aspectRatio: '3:2',
    romSources: [
      { label: 'Homebrew Hub (GBA)', url: 'https://hh.gbdev.io/games?platform=GBA', description: 'ROMs .gba gratuitas e open-source para mGBA/VBA Next.' },
      { label: 'GBA Homebrew (itch.io)', url: 'https://itch.io/games/tag-gba', description: 'Jogos homebrew em formato .gba sem precisar de BIOS.' },
    ],
  },
  {
    id: 'vb',
    name: 'Nintendo Virtual Boy',
    shortName: 'Virtual Boy',
    manufacturer: 'Nintendo',
    year: 1995,
    extensions: ['.vb', '.vboy'],
    webCore: 'mednafen_vb',
    altWebCores: ['mednafen_vb'],
    androidCoreSo: 'mednafen_vb_libretro_android.so',
    androidCoreDownloadUrl: 'https://buildbot.libretro.com/nightly/android/latest/arm64-v8a/mednafen_vb_libretro_android.so.zip',
    aspectRatio: '16:9',
    romSources: [
      { label: 'Planet Virtual Boy Homebrew', url: 'https://www.planetvb.com/modules/games/', description: 'ROMs .vb originais criadas por fãs.' },
    ],
  },
  {
    id: 'gw',
    name: 'Nintendo Game & Watch (Portátil LCD)',
    shortName: 'Game & Watch',
    manufacturer: 'Nintendo',
    year: 1980,
    extensions: ['.mgw'],
    webCore: 'gw',
    altWebCores: ['gw'],
    androidCoreSo: 'gw_libretro_android.so',
    androidCoreDownloadUrl: 'https://buildbot.libretro.com/nightly/android/latest/arm64-v8a/gw_libretro_android.so.zip',
    aspectRatio: '4:3',
    romSources: [
      { label: 'Madrigal LCD Simulators / Archive', url: 'https://archive.org/search?query=game+and+watch+mgw', description: 'Simulações clássicas de LCD em formato .mgw.' },
    ],
  },

  // ================= SEGA =================
  {
    id: 'megadrive',
    name: 'Sega Mega Drive / Genesis',
    shortName: 'Mega Drive / Genesis',
    manufacturer: 'Sega',
    year: 1988,
    extensions: ['.md', '.gen', '.smd', '.bin'],
    webCore: 'genesis_plus_gx',
    altWebCores: ['genesis_plus_gx', 'genesis_plus_gx_wide', 'picodrive', 'clownmdemu'],
    androidCoreSo: 'genesis_plus_gx_libretro_android.so',
    androidCoreDownloadUrl: 'https://buildbot.libretro.com/nightly/android/latest/arm64-v8a/genesis_plus_gx_libretro_android.so.zip',
    aspectRatio: '4:3',
    romSources: [
      { label: 'Sega Genesis / Mega Drive (itch.io)', url: 'https://itch.io/games/tag-sega-genesis', description: 'ROMs .md / .bin gratuitas compatíveis com Genesis Plus GX.' },
      { label: 'Mega Drive Homebrew (Archive)', url: 'https://archive.org/search?query=sega+genesis+homebrew+rom', description: 'Acervo de ROMs Mega Drive de domínio público.' },
    ],
  },
  {
    id: 'sega32x',
    name: 'Sega 32X',
    shortName: 'Sega 32X',
    manufacturer: 'Sega',
    year: 1994,
    extensions: ['.32x'],
    webCore: 'picodrive',
    altWebCores: ['picodrive'],
    androidCoreSo: 'picodrive_libretro_android.so',
    androidCoreDownloadUrl: 'https://buildbot.libretro.com/nightly/android/latest/arm64-v8a/picodrive_libretro_android.so.zip',
    aspectRatio: '4:3',
    romSources: [
      { label: 'Sega 32X Homebrew (SpritesMind)', url: 'https://gendev.spritesmind.net/forum/viewforum.php?f=6', description: 'Demos e jogos .32x criados para PicoDrive.' },
    ],
  },
  {
    id: 'segacd',
    name: 'Sega CD / Mega-CD',
    shortName: 'Sega CD / Mega-CD',
    manufacturer: 'Sega',
    year: 1991,
    extensions: ['.chd', '.cue'],
    webCore: 'genesis_plus_gx',
    altWebCores: ['genesis_plus_gx', 'picodrive'],
    androidCoreSo: 'genesis_plus_gx_libretro_android.so',
    androidCoreDownloadUrl: 'https://buildbot.libretro.com/nightly/android/latest/arm64-v8a/genesis_plus_gx_libretro_android.so.zip',
    aspectRatio: '4:3',
    romSources: [
      { label: 'Sega CD Homebrew (Archive)', url: 'https://archive.org/search?query=sega+cd+homebrew', description: 'Imagens .chd / .cue de projetos independentes.' },
    ],
  },
  {
    id: 'mastersystem',
    name: 'Sega Master System',
    shortName: 'Master System',
    manufacturer: 'Sega',
    year: 1985,
    extensions: ['.sms'],
    webCore: 'genesis_plus_gx',
    altWebCores: ['genesis_plus_gx', 'gearsystem', 'picodrive'],
    androidCoreSo: 'genesis_plus_gx_libretro_android.so',
    androidCoreDownloadUrl: 'https://buildbot.libretro.com/nightly/android/latest/arm64-v8a/genesis_plus_gx_libretro_android.so.zip',
    aspectRatio: '4:3',
    romSources: [
      { label: 'SMS Power! Homebrew', url: 'https://www.smspower.org/Homebrew/Index', description: 'Maior arquivo dedicado de ROMs .sms homebrew.' },
      { label: 'Master System (itch.io)', url: 'https://itch.io/games/tag-master-system', description: 'Jogos independentes em formato .sms.' },
    ],
  },
  {
    id: 'gamegear',
    name: 'Sega Game Gear',
    shortName: 'Game Gear',
    manufacturer: 'Sega',
    year: 1990,
    extensions: ['.gg'],
    webCore: 'genesis_plus_gx',
    altWebCores: ['genesis_plus_gx', 'gearsystem'],
    androidCoreSo: 'genesis_plus_gx_libretro_android.so',
    androidCoreDownloadUrl: 'https://buildbot.libretro.com/nightly/android/latest/arm64-v8a/genesis_plus_gx_libretro_android.so.zip',
    aspectRatio: '4:3',
    romSources: [
      { label: 'SMS Power! (Game Gear)', url: 'https://www.smspower.org/Homebrew/Index', description: 'ROMs .gg criadas para o portátil colorido da Sega.' },
    ],
  },
  {
    id: 'sg1000',
    name: 'Sega SG-1000 / SC-3000',
    shortName: 'Sega SG-1000',
    manufacturer: 'Sega',
    year: 1983,
    extensions: ['.sg'],
    webCore: 'genesis_plus_gx',
    altWebCores: ['genesis_plus_gx', 'gearsystem'],
    androidCoreSo: 'genesis_plus_gx_libretro_android.so',
    androidCoreDownloadUrl: 'https://buildbot.libretro.com/nightly/android/latest/arm64-v8a/genesis_plus_gx_libretro_android.so.zip',
    aspectRatio: '4:3',
    romSources: [
      { label: 'SMS Power! SG-1000', url: 'https://www.smspower.org/Homebrew/Index', description: 'ROMs .sg históricas do primeiro console da Sega.' },
    ],
  },

  // ================= NEC =================
  {
    id: 'pce',
    name: 'PC Engine / TurboGrafx-16 / SuperGrafx',
    shortName: 'PC Engine / TG-16',
    manufacturer: 'NEC',
    year: 1987,
    extensions: ['.pce', '.sgx'],
    webCore: 'mednafen_pce_fast',
    altWebCores: ['mednafen_pce_fast', 'geargrafx'],
    androidCoreSo: 'mednafen_pce_fast_libretro_android.so',
    androidCoreDownloadUrl: 'https://buildbot.libretro.com/nightly/android/latest/arm64-v8a/mednafen_pce_fast_libretro_android.so.zip',
    aspectRatio: '4:3',
    romSources: [
      { label: 'PC Engine Homebrew (Archive)', url: 'https://archive.org/search?query=pc+engine+homebrew+pce', description: 'ROMs .pce abertas para Beetle PCE Fast e Geargrafx.' },
    ],
  },

  // ================= SNK / ARCADE =================
  {
    id: 'ngp',
    name: 'SNK Neo Geo Pocket / Color',
    shortName: 'Neo Geo Pocket',
    manufacturer: 'SNK / Arcade',
    year: 1998,
    extensions: ['.ngp', '.ngc'],
    webCore: 'mednafen_ngp',
    altWebCores: ['mednafen_ngp'],
    androidCoreSo: 'mednafen_ngp_libretro_android.so',
    androidCoreDownloadUrl: 'https://buildbot.libretro.com/nightly/android/latest/arm64-v8a/mednafen_ngp_libretro_android.so.zip',
    aspectRatio: '4:3',
    romSources: [
      { label: 'Neo Geo Pocket Homebrew (itch.io)', url: 'https://itch.io/games/tag-neo-geo-pocket', description: 'Cartuchos .ngc/.ngp gratuitos da comunidade.' },
    ],
  },
  {
    id: 'arcade',
    name: 'Arcade Geral / CPS-1 / CPS-2 / CPS-3',
    shortName: 'Arcade / CPS1-3',
    manufacturer: 'SNK / Arcade',
    year: 1990,
    extensions: ['.zip'],
    webCore: 'fbneo',
    altWebCores: ['fbneo', 'mame2003_plus', 'mame2003', 'mame2000', 'fbalpha2012', 'fbalpha2012_cps1', 'fbalpha2012_cps2'],
    androidCoreSo: 'fbneo_libretro_android.so',
    androidCoreDownloadUrl: 'https://buildbot.libretro.com/nightly/android/latest/arm64-v8a/fbneo_libretro_android.so.zip',
    aspectRatio: '4:3',
    romSources: [
      { label: 'MAME / Arcade Public Domain', url: 'https://www.mamedev.org/roms/', description: 'ROMs de arcade liberadas gratuitamente pelos autores originais.' },
      { label: 'Arcade Homebrew (Archive)', url: 'https://archive.org/search?query=arcade+homebrew+fbneo', description: 'Pacotes .zip compatíveis com motores Arcade clássicos.' },
    ],
  },
  {
    id: 'arcade2000',
    name: 'Arcade 2000 (MAME 2000 · Clássicos Leves)',
    shortName: 'Arcade 2000',
    manufacturer: 'SNK / Arcade',
    year: 2000,
    extensions: ['.zip'],
    webCore: 'mame2000',
    altWebCores: ['mame2000', 'mame2003', 'mame2003_plus', 'fbneo'],
    androidCoreSo: 'mame2000_libretro_android.so',
    androidCoreDownloadUrl: 'https://buildbot.libretro.com/nightly/android/latest/arm64-v8a/mame2000_libretro_android.so.zip',
    aspectRatio: '4:3',
    romSources: [
      { label: 'MAME 0.37b5 / Arcade 2000 Free ROMs', url: 'https://www.mamedev.org/roms/', description: 'Jogos arcade leves ideais para celulares mais fracos a 30 FPS.' },
      { label: 'Archive Arcade 2000 Sets', url: 'https://archive.org/search?query=mame+2000+romset', description: 'Jogos de fliperama compatíveis com Arcade 2000 (.zip).' },
    ],
  },
  {
    id: 'arcade2003',
    name: 'Arcade 2003 (MAME 2003 · 0.78)',
    shortName: 'Arcade 2003',
    manufacturer: 'SNK / Arcade',
    year: 2003,
    extensions: ['.zip'],
    webCore: 'mame2003',
    altWebCores: ['mame2003', 'mame2003_plus', 'mame2000', 'fbneo'],
    androidCoreSo: 'mame2003_libretro_android.so',
    androidCoreDownloadUrl: 'https://buildbot.libretro.com/nightly/android/latest/arm64-v8a/mame2003_libretro_android.so.zip',
    aspectRatio: '4:3',
    romSources: [
      { label: 'MAME 2003 (0.78) Freeware / PD', url: 'https://archive.org/search?query=mame+2003+0.78', description: 'Clássicos de fliperama 2D em pacotes .zip para Arcade 2003.' },
    ],
  },
  {
    id: 'arcade2003plus',
    name: 'Arcade 2003 Plus (MAME 2003-Plus)',
    shortName: 'Arcade 2003 Plus',
    manufacturer: 'SNK / Arcade',
    year: 2003,
    extensions: ['.zip'],
    webCore: 'mame2003_plus',
    altWebCores: ['mame2003_plus', 'mame2003', 'mame2000', 'fbneo'],
    androidCoreSo: 'mame2003_plus_libretro_android.so',
    androidCoreDownloadUrl: 'https://buildbot.libretro.com/nightly/android/latest/arm64-v8a/mame2003_plus_libretro_android.so.zip',
    aspectRatio: '4:3',
    romSources: [
      { label: 'Arcade 2003-Plus Sets (Archive)', url: 'https://archive.org/search?query=mame+2003+plus', description: 'Suporte estendido de áudio e jogos clássicos Arcade 2003 Plus.' },
    ],
  },
  {
    id: 'arcade2010',
    name: 'Arcade 2010 (MAME 2010 · 0.139)',
    shortName: 'Arcade 2010',
    manufacturer: 'SNK / Arcade',
    year: 2010,
    extensions: ['.zip'],
    webCore: 'mame2003_plus',
    altWebCores: ['mame2003_plus', 'fbneo', 'mame2003', 'mame2000'],
    androidCoreSo: 'mame2010_libretro_android.so',
    androidCoreDownloadUrl: 'https://buildbot.libretro.com/nightly/android/latest/arm64-v8a/mame2010_libretro_android.so.zip',
    aspectRatio: '4:3',
    romSources: [
      { label: 'Arcade 2010 (0.139) Archive', url: 'https://archive.org/search?query=mame+2010+0.139', description: 'Jogos Arcade 2010 (.zip); usa motor 2010 no Android e fallback rápido na Web.' },
    ],
  },
  {
    id: 'arcade2013',
    name: 'Arcade 2013 (FBA 2012 / CPS1-2 / MAME)',
    shortName: 'Arcade 2013',
    manufacturer: 'SNK / Arcade',
    year: 2013,
    extensions: ['.zip'],
    webCore: 'fbalpha2012',
    altWebCores: ['fbalpha2012', 'fbalpha2012_cps1', 'fbalpha2012_cps2', 'fbalpha2012_neogeo', 'fbneo'],
    androidCoreSo: 'fbalpha2012_libretro_android.so',
    androidCoreDownloadUrl: 'https://buildbot.libretro.com/nightly/android/latest/arm64-v8a/fbalpha2012_libretro_android.so.zip',
    aspectRatio: '4:3',
    romSources: [
      { label: 'Arcade 2013 / FBA Sets (Archive)', url: 'https://archive.org/search?query=fbalpha2012+arcade', description: 'Pacotes Arcade 2013 de luta, beat-em-up e nave (.zip).' },
    ],
  },
  {
    id: 'arcade2013plus',
    name: 'Arcade 2013 Plus (FBNeo / MAME 2015)',
    shortName: 'Arcade 2013 Plus',
    manufacturer: 'SNK / Arcade',
    year: 2013,
    extensions: ['.zip'],
    webCore: 'fbneo',
    altWebCores: ['fbneo', 'fbalpha2012', 'mame2003_plus', 'mame2003'],
    androidCoreSo: 'mame2015_libretro_android.so',
    androidCoreDownloadUrl: 'https://buildbot.libretro.com/nightly/android/latest/arm64-v8a/mame2015_libretro_android.so.zip',
    aspectRatio: '4:3',
    romSources: [
      { label: 'Arcade 2013 Plus / FBNeo Sets', url: 'https://archive.org/search?query=fbneo+arcade+romset', description: 'Jogos Arcade 2013 Plus de alta compatibilidade (.zip).' },
    ],
  },
  {
    id: 'neogeo',
    name: 'SNK Neo Geo AES / MVS / CD',
    shortName: 'Neo Geo AES/MVS/CD',
    manufacturer: 'SNK / Arcade',
    year: 1990,
    extensions: ['.neo', '.zip'],
    webCore: 'fbneo',
    altWebCores: ['fbneo', 'fbalpha2012_neogeo', 'neocd'],
    androidCoreSo: 'fbneo_libretro_android.so',
    androidCoreDownloadUrl: 'https://buildbot.libretro.com/nightly/android/latest/arm64-v8a/fbneo_libretro_android.so.zip',
    aspectRatio: '4:3',
    romSources: [
      { label: 'Neo Geo Homebrew (itch.io)', url: 'https://itch.io/games/tag-neogeo', description: 'Projetos Neo Geo gratuitos compatíveis com FBNeo/NeoCD.' },
    ],
  },

  // ================= ATARI & PORTÁTEIS CLÁSSICOS =================
  {
    id: 'lynx',
    name: 'Atari Lynx',
    shortName: 'Atari Lynx',
    manufacturer: 'Atari',
    year: 1989,
    extensions: ['.lnx'],
    webCore: 'handy',
    altWebCores: ['handy', 'mednafen_lynx'],
    androidCoreSo: 'handy_libretro_android.so',
    androidCoreDownloadUrl: 'https://buildbot.libretro.com/nightly/android/latest/arm64-v8a/handy_libretro_android.so.zip',
    aspectRatio: '4:3',
    romSources: [
      { label: 'AtariGamer Lynx Homebrew', url: 'https://atarigamer.com/lynx/games', description: 'ROMs .lnx coloridas da cena Atari Lynx.' },
    ],
  },
  {
    id: 'wonderswan',
    name: 'Bandai WonderSwan / Color',
    shortName: 'WonderSwan',
    manufacturer: 'Bandai / Clássicos',
    year: 1999,
    extensions: ['.ws', '.wsc'],
    webCore: 'mednafen_wswan',
    altWebCores: ['mednafen_wswan'],
    androidCoreSo: 'mednafen_wswan_libretro_android.so',
    androidCoreDownloadUrl: 'https://buildbot.libretro.com/nightly/android/latest/arm64-v8a/mednafen_wswan_libretro_android.so.zip',
    aspectRatio: '16:10',
    romSources: [
      { label: 'WonderSwan Homebrew (itch.io)', url: 'https://itch.io/games/tag-wonderswan', description: 'ROMs .ws / .wsc feitas com Wonderful Toolchain.' },
    ],
  },
  {
    id: 'colecovision',
    name: 'ColecoVision',
    shortName: 'ColecoVision',
    manufacturer: 'Bandai / Clássicos',
    year: 1982,
    extensions: ['.col'],
    webCore: 'gearcoleco',
    altWebCores: ['gearcoleco'],
    androidCoreSo: 'gearcoleco_libretro_android.so',
    androidCoreDownloadUrl: 'https://buildbot.libretro.com/nightly/android/latest/arm64-v8a/gearcoleco_libretro_android.so.zip',
    aspectRatio: '4:3',
    romSources: [
      { label: 'ColecoVision Homebrew (AtariAge)', url: 'https://forums.atariage.com/forum/115-colecovision-programming/', description: 'ROMs .col da comunidade ColecoVision.' },
    ],
  },
  {
    id: 'vectrex',
    name: 'GCE Vectrex',
    shortName: 'GCE Vectrex',
    manufacturer: 'Bandai / Clássicos',
    year: 1982,
    extensions: ['.vec'],
    webCore: 'vecx',
    altWebCores: ['vecx'],
    androidCoreSo: 'vecx_libretro_android.so',
    androidCoreDownloadUrl: 'https://buildbot.libretro.com/nightly/android/latest/arm64-v8a/vecx_libretro_android.so.zip',
    aspectRatio: '3:4',
    romSources: [
      { label: 'Vectrex World Homebrew', url: 'https://vectrex.org.uk/', description: 'Jogos vetoriais .vec gratuitos.' },
    ],
  },
  {
    id: 'odyssey2',
    name: 'Magnavox Odyssey 2 / Philips Videopac',
    shortName: 'Odyssey 2 / Videopac',
    manufacturer: 'Bandai / Clássicos',
    year: 1978,
    extensions: ['.o2'],
    webCore: 'o2em',
    altWebCores: ['o2em'],
    androidCoreSo: 'o2em_libretro_android.so',
    androidCoreDownloadUrl: 'https://buildbot.libretro.com/nightly/android/latest/arm64-v8a/o2em_libretro_android.so.zip',
    aspectRatio: '4:3',
    romSources: [
      { label: 'Videopac / Odyssey 2 Homebrew', url: 'https://videopac.nl/forum/', description: 'ROMs clássicas de Odyssey 2 / Videopac.' },
    ],
  },
  {
    id: 'channelf',
    name: 'Fairchild Channel F',
    shortName: 'Fairchild Channel F',
    manufacturer: 'Bandai / Clássicos',
    year: 1976,
    extensions: ['.chf'],
    webCore: 'freechaf',
    altWebCores: ['freechaf'],
    androidCoreSo: 'freechaf_libretro_android.so',
    androidCoreDownloadUrl: 'https://buildbot.libretro.com/nightly/android/latest/arm64-v8a/freechaf_libretro_android.so.zip',
    aspectRatio: '4:3',
    romSources: [
      { label: 'Channel F Homebrew (Archive)', url: 'https://archive.org/search?query=fairchild+channel+f+homebrew', description: 'Cartuchos históricos de 1976 em domínio público.' },
    ],
  },
  {
    id: '3do',
    name: 'Panasonic / GoldStar 3DO',
    shortName: '3DO Multiplayer',
    manufacturer: 'Bandai / Clássicos',
    year: 1993,
    extensions: ['.chd', '.cue'],
    webCore: 'opera',
    altWebCores: ['opera'],
    androidCoreSo: 'opera_libretro_android.so',
    androidCoreDownloadUrl: 'https://buildbot.libretro.com/nightly/android/latest/arm64-v8a/opera_libretro_android.so.zip',
    aspectRatio: '4:3',
    romSources: [
      { label: '3DO Homebrew (3DOdev)', url: 'https://3dodev.com/', description: 'Demos e jogos abertos compilados para 3DO.' },
    ],
  },
  {
    id: 'arduboy',
    name: 'Arduboy (Mini Console 8-bit)',
    shortName: 'Arduboy',
    manufacturer: 'Bandai / Clássicos',
    year: 2016,
    extensions: ['.hex', '.arduboy'],
    webCore: 'arduous',
    altWebCores: ['arduous', 'ardens'],
    androidCoreSo: 'arduous_libretro_android.so',
    androidCoreDownloadUrl: 'https://buildbot.libretro.com/nightly/android/latest/arm64-v8a/arduous_libretro_android.so.zip',
    aspectRatio: '2:1',
    romSources: [
      { label: 'Arduboy Community Games', url: 'https://community.arduboy.com/c/games/35', description: 'Centenas de jogos .hex gratuitos de Arduboy.' },
    ],
  },
  {
    id: 'uzebox',
    name: 'Uzebox Open Source 8-bit',
    shortName: 'Uzebox 8-bit',
    manufacturer: 'Bandai / Clássicos',
    year: 2008,
    extensions: ['.uze'],
    webCore: 'uzem',
    altWebCores: ['uzem'],
    androidCoreSo: 'uzem_libretro_android.so',
    androidCoreDownloadUrl: 'https://buildbot.libretro.com/nightly/android/latest/arm64-v8a/uzem_libretro_android.so.zip',
    aspectRatio: '4:3',
    romSources: [
      { label: 'Uzebox Wiki Games', url: 'https://uzebox.org/wiki/Games_and_Demos', description: 'Jogos retrô gratuitos em .uze.' },
    ],
  },
  {
    id: 'pico8',
    name: 'PICO-8 Fantasy Console',
    shortName: 'PICO-8',
    manufacturer: 'Bandai / Clássicos',
    year: 2015,
    extensions: ['.p8', '.p8.png'],
    webCore: 'retro8',
    altWebCores: ['retro8'],
    androidCoreSo: 'retro8_libretro_android.so',
    androidCoreDownloadUrl: 'https://buildbot.libretro.com/nightly/android/latest/arm64-v8a/retro8_libretro_android.so.zip',
    aspectRatio: '1:1',
    romSources: [
      { label: 'PICO-8 Cartridges (Lexaloffle)', url: 'https://www.lexaloffle.com/bbs/?cat=7', description: 'Cartuchos .p8.png oficiais gratuitos.' },
    ],
  },
  {
    id: 'tic80',
    name: 'TIC-80 Tiny Computer',
    shortName: 'TIC-80',
    manufacturer: 'Bandai / Clássicos',
    year: 2017,
    extensions: ['.tic'],
    webCore: 'tic80',
    altWebCores: ['tic80'],
    androidCoreSo: 'tic80_libretro_android.so',
    androidCoreDownloadUrl: 'https://buildbot.libretro.com/nightly/android/latest/arm64-v8a/tic80_libretro_android.so.zip',
    aspectRatio: '4:3',
    romSources: [
      { label: 'TIC-80 Play Cartridges', url: 'https://tic80.com/play', description: 'Jogos .tic gratuitos feitos pela comunidade.' },
    ],
  },
  {
    id: 'wasm4',
    name: 'WASM-4 Fantasy Console',
    shortName: 'WASM-4',
    manufacturer: 'Bandai / Clássicos',
    year: 2021,
    extensions: ['.wasm'],
    webCore: 'wasm4',
    altWebCores: ['wasm4'],
    androidCoreSo: 'wasm4_libretro_android.so',
    androidCoreDownloadUrl: 'https://buildbot.libretro.com/nightly/android/latest/arm64-v8a/wasm4_libretro_android.so.zip',
    aspectRatio: '1:1',
    romSources: [
      { label: 'WASM-4 Cartridge Library', url: 'https://wasm4.org/play/', description: 'Cartuchos .wasm leves e gratuitos.' },
    ],
  },

  // ================= COMPUTADORES & MOTORES CLÁSSICOS =================
  {
    id: 'c64',
    name: 'Commodore 64 / 128 / VIC-20 / PET',
    shortName: 'Commodore 64 / VIC-20',
    manufacturer: 'Computadores',
    year: 1982,
    extensions: ['.d64', '.t64', '.prg', '.crt'],
    webCore: 'vice_x64',
    altWebCores: ['vice_x64', 'vice_x64sc', 'vice_x128', 'vice_xvic', 'vice_xpet', 'vice_xplus4', 'vice_xscpu64'],
    androidCoreSo: 'vice_x64_libretro_android.so',
    androidCoreDownloadUrl: 'https://buildbot.libretro.com/nightly/android/latest/arm64-v8a/vice_x64_libretro_android.so.zip',
    aspectRatio: '4:3',
    romSources: [
      { label: 'CSDb / C64 Homebrew (itch.io)', url: 'https://itch.io/games/tag-commodore-64', description: 'Disquetes .d64 e cartuchos .crt gratuitos.' },
    ],
  },
  {
    id: 'pc88',
    name: 'NEC PC-8801 (QUASI88)',
    shortName: 'NEC PC-8801',
    manufacturer: 'Computadores',
    year: 1981,
    extensions: ['.d88', '.t88'],
    webCore: 'quasi88',
    altWebCores: ['quasi88'],
    androidCoreSo: 'quasi88_libretro_android.so',
    androidCoreDownloadUrl: 'https://buildbot.libretro.com/nightly/android/latest/arm64-v8a/quasi88_libretro_android.so.zip',
    aspectRatio: '4:3',
    romSources: [
      { label: 'PC-8801 Homebrew (Archive)', url: 'https://archive.org/search?query=pc-8801+homebrew', description: 'Disquetes .d88 do clássico computador japonês.' },
    ],
  },
  {
    id: 'sharpx1',
    name: 'Sharp X1',
    shortName: 'Sharp X1',
    manufacturer: 'Computadores',
    year: 1982,
    extensions: ['.dx1', '.2d', '.tap'],
    webCore: 'x1',
    altWebCores: ['x1'],
    androidCoreSo: 'x1_libretro_android.so',
    androidCoreDownloadUrl: 'https://buildbot.libretro.com/nightly/android/latest/arm64-v8a/x1_libretro_android.so.zip',
    aspectRatio: '4:3',
    romSources: [
      { label: 'Sharp X1 Archive', url: 'https://archive.org/search?query=sharp+x1+homebrew', description: 'Imagens .2d e fitas .tap clássicas.' },
    ],
  },
  {
    id: 'thomson',
    name: 'Thomson MO5 / TO7 / TO8',
    shortName: 'Thomson MO/TO',
    manufacturer: 'Computadores',
    year: 1984,
    extensions: ['.fd', '.sap', '.k7'],
    webCore: 'theodore',
    altWebCores: ['theodore'],
    androidCoreSo: 'theodore_libretro_android.so',
    androidCoreDownloadUrl: 'https://buildbot.libretro.com/nightly/android/latest/arm64-v8a/theodore_libretro_android.so.zip',
    aspectRatio: '4:3',
    romSources: [
      { label: 'DCMOTO / Thomson Archive', url: 'https://archive.org/search?query=thomson+to8+homebrew', description: 'Discos .fd/.sap e fitas .k7 francesas.' },
    ],
  },
  {
    id: 'p2000',
    name: 'Philips P2000T',
    shortName: 'Philips P2000T',
    manufacturer: 'Computadores',
    year: 1980,
    extensions: ['.cas'],
    webCore: 'm2000',
    altWebCores: ['m2000'],
    androidCoreSo: 'm2000_libretro_android.so',
    androidCoreDownloadUrl: 'https://buildbot.libretro.com/nightly/android/latest/arm64-v8a/m2000_libretro_android.so.zip',
    aspectRatio: '4:3',
    romSources: [
      { label: 'Philips P2000T Archive', url: 'https://archive.org/search?query=philips+p2000t', description: 'Fitas .cas de microcomputador clássico.' },
    ],
  },
  {
    id: 'mac',
    name: 'Apple Macintosh 128K / Plus (Mini vMac)',
    shortName: 'Macintosh Plus',
    manufacturer: 'Computadores',
    year: 1984,
    extensions: ['.dsk'],
    webCore: 'minivmac',
    altWebCores: ['minivmac'],
    androidCoreSo: 'minivmac_libretro_android.so',
    androidCoreDownloadUrl: 'https://buildbot.libretro.com/nightly/android/latest/arm64-v8a/minivmac_libretro_android.so.zip',
    aspectRatio: '4:3',
    romSources: [
      { label: 'Macintosh Repository (Freeware)', url: 'https://www.macintoshrepository.org/', description: 'Disquetes .dsk clássicos de domínio público.' },
    ],
  },
  {
    id: 'bk',
    name: 'Elektronika BK-0010 / BK-0011',
    shortName: 'Elektronika BK',
    manufacturer: 'Computadores',
    year: 1985,
    extensions: ['.bk'],
    webCore: 'bk',
    altWebCores: ['bk'],
    androidCoreSo: 'bk_libretro_android.so',
    androidCoreDownloadUrl: 'https://buildbot.libretro.com/nightly/android/latest/arm64-v8a/bk_libretro_android.so.zip',
    aspectRatio: '4:3',
    romSources: [
      { label: 'BK-0010 Archive', url: 'https://archive.org/search?query=elektronika+bk-0010', description: 'Softwares e jogos clássicos .bk.' },
    ],
  },
  {
    id: 'galaksija',
    name: 'Galaksija Microcomputer',
    shortName: 'Galaksija',
    manufacturer: 'Computadores',
    year: 1983,
    extensions: ['.gtp'],
    webCore: 'galaksija',
    altWebCores: ['galaksija'],
    androidCoreSo: 'galaksija_libretro_android.so',
    androidCoreDownloadUrl: 'https://buildbot.libretro.com/nightly/android/latest/arm64-v8a/galaksija_libretro_android.so.zip',
    aspectRatio: '4:3',
    romSources: [
      { label: 'Galaksija Archive', url: 'https://archive.org/search?query=galaksija+gtp', description: 'Fitas .gtp de jogos retrô 8-bit.' },
    ],
  },
  {
    id: 'doom',
    name: 'Motores Clássicos (Doom / Quake / Wolf3D / Cave Story / Indie)',
    shortName: 'Doom / Quake / Engines',
    manufacturer: 'Computadores',
    year: 1993,
    extensions: ['.wad', '.pak', '.wl6', '.nx', '.uw8', '.vspec'],
    webCore: 'prboom',
    altWebCores: [
      'prboom',
      'tyrquake',
      'ecwolf',
      'nxengine',
      'lowresnx',
      'mrboom',
      'xrick',
      'chailove',
      'lutro',
      'uw8',
      'vaporspec',
      '2048',
      'gong',
      'craft',
      'anarch',
      'jumpnbump',
      'jaxe',
      'mu',
      'numero',
      'tamalibretro',
      'squirreljme',
      'gam4980',
      'gme',
      'dice',
      'pocketcdg',
    ],
    androidCoreSo: 'prboom_libretro_android.so',
    androidCoreDownloadUrl: 'https://buildbot.libretro.com/nightly/android/latest/arm64-v8a/prboom_libretro_android.so.zip',
    aspectRatio: '4:3',
    romSources: [
      { label: 'Freedoom (.wad gratuito)', url: 'https://freedoom.github.io/', description: 'Arquivos .wad 100% livres compatíveis com PrBoom.' },
      { label: 'LowRes NX / Jogos Indie', url: 'https://lowresnx.inutilis.com/programs.php', description: 'Cartuchos .nx e jogos gratuitos.' },
    ],
  },
];

export const TOTAL_WEB_CORE_COUNT = CLASSIC_CONSOLE_CORES.reduce(
  (sum, c) => sum + c.altWebCores.length,
  0
);

export function getConsoleSpecById(id: ConsoleId): ConsoleCoreSpec {
  return CLASSIC_CONSOLE_CORES.find((c) => c.id === id) || CLASSIC_CONSOLE_CORES[0];
}

export function detectConsoleFromExtension(fileName: string): ConsoleCoreSpec | null {
  const lower = fileName.toLowerCase();
  for (const blocked of SONY_BLOCKED_EXTENSIONS) {
    if (lower.endsWith(blocked)) {
      throw new Error(
        `Formato ${blocked} pertencente a consoles Sony (PS1/PS2/PSP/Vita) não é suportado. Este emulador inclui apenas núcleos clássicos sem Sony.`
      );
    }
  }
  if (/(\(psx\)|\(ps1\)|\(ps2\)|\(psp\)|playstation)/i.test(lower)) {
    throw new Error(
      'ROMs de consoles Sony (PlayStation / PS1 / PS2 / PSP) não são aceitas. Utilize apenas núcleos clássicos sem Sony.'
    );
  }
  for (const spec of CLASSIC_CONSOLE_CORES) {
    if (spec.extensions.some((ext) => lower.endsWith(ext))) {
      return spec;
    }
  }
  return null;
}

export const ALL_SUPPORTED_EXTENSIONS = Array.from(
  new Set(CLASSIC_CONSOLE_CORES.flatMap((c) => c.extensions))
).join(',');
