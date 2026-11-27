/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface MusoJianpuTemplate {
  id: string;
  title: string;
  subtitle: string;
  key: string;
  content: string;
}

export const MUSOJIANPU_JASMINE_SAMPLE = `@title: 茉莉花
@subtitle: Jasmine Flower (江苏民歌 · 二胡独奏)
@composer: 江苏民歌
@arranger: MusoJianpu 简谱编配
@key: 1=G
@strings: 5-2
@time: 4/4
@tempo: 84
@expression: 柔美抒情地 Moderato

S: 第一段 (Theme)
| 3{pull,一,out,mp} 3_5_ (6_1'_) (1'_6_) | 5{pull,三,out} (5_6_) 5{push,三,vib} - |
L: 好 一 朵 美 丽 的 _ 茉 莉 _ 花，
| 3{pull,一,out} 3_5_ (6_1'_) (1'_6_) | 5{pull,三,out} (5_6_) 5{push,三,vib} - |
L: 好 一 朵 美 丽 的 _ 茉 莉 _ 花，
| 5{pull,三,out,mf} 5{push,三} 5{pull,三} (3_5_) | 6{push,四,vib} 6{pull,四} 5{push,三,dim} - |
L: 芬 芳 美 丽 _ 满 枝 桠，
| 3{pull,一,out} (2_3_) 5{push,三} (3_2_) | 1{pull,三,in,vib} (1_2_) 1{push,三} - |
L: 又 香 _ 又 白 _ 人 人 _ 夸。

S: 第二段 (Refrain)
| 3{pull,一,out,mp} 2{push,0} 1{pull,三,in} 3{push,一,out} | (2_3_) (5_6_) 5{pull,三,vib} - |
L: 让 我 来 将 你 _ 摘 _ 下，
| 2{push,0,out} (3_5_) (2_3_) (1_6,_) | 5,{pull,0,in,vib} - - - |
L: 送 给 _ 别 _ 人 _ 家，
| 1{push,三,in,mp} (6,_1_) 2{pull,0,out} (3_5_) | (3_2_) (1_6,_) 5,{push,0,in,vib,fermata} - |]
L: 茉 莉 _ 花 呀 _ 茉 _ 莉 _ 花。

T: 演奏提示：采用G调（5-2弦）定弦，音域从内空弦低音5到外弦高音1，运弓柔和连贯，展现江南民歌清丽婉转的韵味。`;

export const MUSOJIANPU_SONGBIE_SAMPLE = `@title: 送别
@subtitle: Farewell (长亭外，古道边)
@composer: John P. Ordway · 词：李叔同
@arranger: MusoJianpu 简谱编配
@key: 1=G
@strings: 5-2
@time: 4/4
@tempo: 76
@expression: 深情如歌地 Andante

S: 第一乐段 (Verse 1)
| 5{pull,三,out,mp} (3_5_) 1'{push,三,vib} - | 6{pull,一} 1'{push,三} 5{pull,三,vib} - | 5{push,三} (1_2_) 3{pull,一} (2_1_) | 2{push,0,vib} - - - |
L: 长 亭 _ 外， 古 道 边， 芳 草 _ 碧 连 _ 天。
| 5{pull,三,out} (3_5_) 1'.{push,三,vib} 7_{二} | 6{pull,一} 1'{push,三} 5{pull,三,vib} - | 5{push,三} (2_3_) 4.{pull,二,out} 7,_{二,in} | 1{push,三,vib} - - - |
L: 晚 风 _ 拂 柳 笛 声 残， 夕 阳 _ 山 外 山。

S: 第二乐段 (Verse 2)
| 6{pull,一,mf} 1'{push,三} 1'{pull,三,vib} - | 7{push,二} (6_7_) 1'{pull,三,vib} - | 6{push,一} (1'_6_) 5{pull,三} (3_1_) | 2{push,0,vib} - - - |
L: 天 之 涯， 地 之 _ 角， 知 交 _ 半 零 _ 落。
| 5{pull,三,mp} (3_5_) 1'.{push,三,vib} 7_{二} | 6{pull,一} 1'{push,三} 5{pull,三,vib} - | 5{push,三,dim} (2_3_) 4.{pull,二,rit} 7,_{二,in} | 1{push,三,vib,fermata} - - - |]
L: 一 壶 _ 浊 酒 尽 余 欢， 今 宵 _ 别 梦 寒。

T: 演奏提示：G调（5-2弦）经典二胡抒情曲；注意附点节奏平稳，长音结合滚揉展现绵长深情。`;

export const MUSOJIANPU_AULD_LANG_SYNE_SAMPLE = `@title: 友谊地久天长
@subtitle: Auld Lang Syne (二胡独奏)
@composer: 苏格兰民歌
@arranger: MusoJianpu 简谱编配
@key: 1=G
@strings: 5-2
@time: 4/4
@tempo: 80
@expression: 温暖深情地 Moderato

S: 主题 (Theme)
| 0 0 0 5,{pull,0,in,mp} | 1.{push,三,vib} 1_{三} 1{pull,三} 3{push,一,out} | 2.{pull,0,vib} 1_{三,in} 2{push,0,out} (3_2_) | 1.{pull,三,in} 1_{三} 3{push,一,out} 5{pull,三} | 6{push,四,vib} - - 6{pull,四} |
| 5.{push,三,mf} 3_{一} 3{pull,一} 1{push,三,in} | 2.{pull,0,out,vib} 1_{三,in} 2{push,0,out} (3_2_) | 1.{pull,三,in} 6,_{一} 6,{push,一} 5,{pull,0} | 1{push,三,vib,fermata} - - 0 |]

T: 演奏提示：弱起小节由内空弦轻柔入弓，附点四分音符与八分音符交替自然流畅。`;

export const MUSOJIANPU_ODE_TO_JOY_SAMPLE = `@title: 欢乐颂
@subtitle: Ode to Joy (二胡G调练习曲)
@composer: L. van Beethoven
@arranger: MusoJianpu 简谱编配
@key: 1=G
@strings: 5-2
@time: 4/4
@tempo: 104
@expression: 庄严明朗地 Allegro moderato

S: 主旋律 (Main Theme)
| 3{pull,一,out,mf} 3{push,一} 4{pull,二} 5{push,三} | 5{pull,三} 4{push,二} 3{pull,一} 2{push,0} | 1{pull,三,in} 1{push,三} 2{pull,0,out} 3{push,一} | 3.{pull,一,vib} 2_{0} 2{push,0} - |
| 3{pull,一,out} 3{push,一} 4{pull,二} 5{push,三} | 5{pull,三} 4{push,二} 3{pull,一} 2{push,0} | 1{pull,三,in} 1{push,三} 2{pull,0,out} 3{push,一} | 2.{pull,0,vib} 1_{三,in} 1{push,三} - |
| 2{pull,0,out,mp} 2{push,0} 3{pull,一} 1{push,三,in} | 2{pull,0,out} (3_4_) 3{push,一} 1{pull,三,in} | 2{push,0,out} (3_4_) 3{pull,一} 2{push,0} | 1{pull,三,in} 2{push,0,out} 5,{pull,0,in,vib} - |
| 3{pull,一,out,f} 3{push,一} 4{pull,二} 5{push,三} | 5{pull,三} 4{push,二} 3{pull,一} 2{push,0} | 1{pull,三,in} 1{push,三} 2{pull,0,out} 3{push,一} | 2.{pull,0,vib} 1_{三,in} 1{push,三,fermata} - |]

T: 演奏提示：G调（5-2弦）换弦与分弓练习；注意3与4（半音）的指距紧密靠拢。`;

export const MUSOJIANPU_PIPA_SAMPLE = `@title: 琵琶技巧练习曲 (示例)
@subtitle: Pipa Technique Etude · 弹挑、扫拂、轮指与和弦
@composer: MusoJianpu 示范谱
@instrument: pipa
@key: 1=D
@strings: A-d-e-a
@time: 2/4
@tempo: 100
@expression: 清新明快地 Allegretto

S: 示范段落 (弹挑、扫拂和弦、轮指与嵌套连线)
|: <1 5 1'>{sao,f} (5/{tan,s1} 6/{tiao}) | ((1'/{tan} 2'/{tiao}) (1'/{tan} 6/{tiao})) | <5, 5>{fen,mf} (3/{tan,s2} 5/{tiao}) | 6{lun,vib} - |
| <1 3 5>{sao,s1} <2 5 6>{fu} | (5/{tan} 3/{tiao} 2/{tan} 1/{tiao}) | [1. 2{banlun} (3/{tan} 5/{tiao}) :| [2. <1, 5, 1>{sao,fermata} - |]

T: 示范说明：本曲为原创琵琶记谱示例（非古曲原谱），采用标准定弦 A-d-e-a，演示和弦扫拂、弹挑、半轮/轮指与嵌套连音线。`;

export const MUSOJIANPU_GUZHENG_SAMPLE = `@title: 古筝技巧练习曲 (示例)
@subtitle: Guzheng Technique Etude · 大撮、琶音、刮奏与摇指
@composer: MusoJianpu 示范谱
@instrument: guzheng
@key: 1=D
@time: 4/4
@tempo: 68
@expression: 悠然恬静地 Andante espressivo

S: 示范段落 (撮弦、琶音、刮奏与摇指)
| <5, 5>{cuo,mp} (6/{mo} 5/{tuo}) <3 3'>{arp} 2{mo,an} | ((1/{gou} 2/{mo}) (3/{tuo} 5/{tuo})) 6{yao,mf} - |
| <1 3 5 1'>{arp,gua} 6{mo,vib} <5 5'>{cuo} (3/{mo} 2/{tuo}) | <1, 5, 1>{arp,guadown,dim} 1{tuo,fermata} - - |]

T: 示范说明：本曲为原创古筝记谱示例（非古曲原谱），采用 D 调五声音阶定弦，演示大撮、托抹勾、琶音、上下刮奏与摇指。`;

export const MUSOJIANPU_DIZI_SAMPLE = `@title: 笛子技巧练习曲 (示例)
@subtitle: Dizi Technique Etude · 叠音、打音、历音与花舌
@composer: MusoJianpu 示范谱
@instrument: dizi
@key: 1=C
@flute: 曲笛 C调
@fingering: 筒音作5
@time: 4/4
@tempo: 72
@expression: 宁静优美地 Andante cantabile

S: 示范段落 (曲笛叠音、打音、历音、吐音与花舌)
| (5{die,mp} 6/ 5/) (3{da} 2/) 1{vib,zeng} 2{breath} | ((3/{li} 5/) (6/ 1'/)) 6{qizhen,mf} - |
| (5/{tu} 6/{dtu} 5/{tu} 3/{da}) (2/{die} 3/) 5{huashe,f} - | (6/{lidown} 5/ 3/{bo} 2/) 1{qizhen,fermata} - - |]

T: 示范说明：本曲为原创笛子记谱示例（非古曲原谱）；C 调曲笛筒音作 5 即为 1=C，演示叠音（又）、打音（丁）、历音、单双吐、波音与花舌（※）。`;

export const MUSOJIANPU_XIAO_SAMPLE = `@title: 洞箫技巧练习曲 (示例)
@subtitle: Xiao Technique Etude · 气震音、叠音、赠音与气口
@composer: MusoJianpu 示范谱
@instrument: xiao
@key: 1=G
@flute: G调洞箫
@fingering: 筒音作5
@time: 4/4
@tempo: 60
@expression: 婉转深沉地 Lento espressivo

S: 示范段落 (洞箫气震音、叠音、打音、赠音与滑音)
| 5,{qizhen,p} - (1{die} 2/{da} 3/) | (5{su,mp} 3/ 2/) 1{qizhen,zeng,breath} - |
| ((6,{die} 1/) (2/ 3/)) (2{sd} 1/) 6,{qizhen,mp} - | (5,{da} 6,/ 1/{bo} 2/) 5,{qizhen,dim,fermata} - - |]

T: 示范说明：本曲为原创洞箫记谱示例（非古曲原谱）；G 调洞箫筒音作 5 即为 1=G，演示气震音、叠音（又）、打音（丁）、赠音、波音与气口（V）。`;

export const MUSOJIANPU_BLANK_TEMPLATE = `@title: 未命名二胡曲
@subtitle: Untitled Erhu Piece
@composer: 作曲
@key: 1=D
@strings: 1-5
@time: 4/4
@tempo: 80
@expression: 中板 Moderato

S: 主旋律
| 1{pull,0,in,mf} 2{push,一} 3{pull,二} 5{push,0,out} | (6{pull,一,vib} 5{push,0}) 3{pull,二,in} - | 2_3_ 5_6_ 1'{pull,三,out,su} 6_5_ | 5{push,0,vib} - - - |]`;

export const MUSOJIANPU_TEMPLATES: MusoJianpuTemplate[] = [
  {
    id: 'jasmine',
    title: '茉莉花 (带歌词)',
    subtitle: 'Jasmine Flower · 二胡 1=G (5-2弦)',
    key: 'G',
    content: MUSOJIANPU_JASMINE_SAMPLE
  },
  {
    id: 'songbie',
    title: '送别 (带歌词)',
    subtitle: 'Farewell (长亭外) · 二胡 1=G (5-2弦)',
    key: 'G',
    content: MUSOJIANPU_SONGBIE_SAMPLE
  },
  {
    id: 'dizi-etude',
    title: '笛子技巧示例 (Etude)',
    subtitle: 'Dizi Notation Demo · C调曲笛 筒音作5 (1=C)',
    key: 'C',
    content: MUSOJIANPU_DIZI_SAMPLE
  },
  {
    id: 'xiao-etude',
    title: '洞箫技巧示例 (Etude)',
    subtitle: 'Xiao Notation Demo · G调洞箫 筒音作5 (1=G)',
    key: 'G',
    content: MUSOJIANPU_XIAO_SAMPLE
  },
  {
    id: 'pipa-etude',
    title: '琵琶技巧示例 (Etude)',
    subtitle: 'Pipa Notation Demo · 和弦 / 扫拂 / 轮指 / 嵌套连线',
    key: 'D',
    content: MUSOJIANPU_PIPA_SAMPLE
  },
  {
    id: 'guzheng-etude',
    title: '古筝技巧示例 (Etude)',
    subtitle: 'Guzheng Notation Demo · 大撮 / 琶音 / 刮奏 / 摇指',
    key: 'D',
    content: MUSOJIANPU_GUZHENG_SAMPLE
  },
  {
    id: 'auld-lang-syne',
    title: '友谊地久天长',
    subtitle: 'Auld Lang Syne · 二胡 1=G (5-2弦)',
    key: 'G',
    content: MUSOJIANPU_AULD_LANG_SYNE_SAMPLE
  },
  {
    id: 'ode-to-joy',
    title: '欢乐颂 (练习曲)',
    subtitle: 'Ode to Joy · 二胡 1=G (5-2弦)',
    key: 'G',
    content: MUSOJIANPU_ODE_TO_JOY_SAMPLE
  },
  {
    id: 'blank',
    title: '空白二胡简谱',
    subtitle: 'Blank Erhu Template · 1=D (1-5弦)',
    key: 'D',
    content: MUSOJIANPU_BLANK_TEMPLATE
  }
];
