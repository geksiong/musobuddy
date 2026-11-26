/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface SimpErhuTemplate {
  id: string;
  title: string;
  subtitle: string;
  key: string;
  content: string;
}

export const SIMPERHU_JASMINE_SAMPLE = `@title: 茉莉花
@subtitle: Jasmine Flower (江苏民歌 · 二胡独奏)
@composer: 江苏民歌
@arranger: SimpErhu 简谱编配
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

export const SIMPERHU_SONGBIE_SAMPLE = `@title: 送别
@subtitle: Farewell (长亭外，古道边)
@composer: John P. Ordway · 词：李叔同
@arranger: SimpErhu 简谱编配
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

export const SIMPERHU_AULD_LANG_SYNE_SAMPLE = `@title: 友谊地久天长
@subtitle: Auld Lang Syne (二胡独奏)
@composer: 苏格兰民歌
@arranger: SimpErhu 简谱编配
@key: 1=G
@strings: 5-2
@time: 4/4
@tempo: 80
@expression: 温暖深情地 Moderato

S: 主题 (Theme)
| 0 0 0 5,{pull,0,in,mp} | 1.{push,三,vib} 1_{三} 1{pull,三} 3{push,一,out} | 2.{pull,0,vib} 1_{三,in} 2{push,0,out} (3_2_) | 1.{pull,三,in} 1_{三} 3{push,一,out} 5{pull,三} | 6{push,四,vib} - - 6{pull,四} |
| 5.{push,三,mf} 3_{一} 3{pull,一} 1{push,三,in} | 2.{pull,0,out,vib} 1_{三,in} 2{push,0,out} (3_2_) | 1.{pull,三,in} 6,_{一} 6,{push,一} 5,{pull,0} | 1{push,三,vib,fermata} - - 0 |]

T: 演奏提示：弱起小节由内空弦轻柔入弓，附点四分音符与八分音符交替自然流畅。`;

export const SIMPERHU_ODE_TO_JOY_SAMPLE = `@title: 欢乐颂
@subtitle: Ode to Joy (二胡G调练习曲)
@composer: L. van Beethoven
@arranger: SimpErhu 简谱编配
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

export const SIMPERHU_BLANK_TEMPLATE = `@title: 未命名二胡曲
@subtitle: Untitled Erhu Piece
@composer: 作曲
@key: 1=D
@strings: 1-5
@time: 4/4
@tempo: 80
@expression: 中板 Moderato

S: 主旋律
| 1{pull,0,in,mf} 2{push,一} 3{pull,二} 5{push,0,out} | (6{pull,一,vib} 5{push,0}) 3{pull,二,in} - | 2_3_ 5_6_ 1'{pull,三,out,su} 6_5_ | 5{push,0,vib} - - - |]`;

// Legacy alias kept for compatibility
export const SIMPERHU_ERQUAN_SAMPLE = SIMPERHU_JASMINE_SAMPLE;

export const SIMPERHU_TEMPLATES: SimpErhuTemplate[] = [
  {
    id: 'jasmine',
    title: '茉莉花 (带歌词)',
    subtitle: 'Jasmine Flower · 1=G (5-2弦)',
    key: 'G',
    content: SIMPERHU_JASMINE_SAMPLE
  },
  {
    id: 'songbie',
    title: '送别 (带歌词)',
    subtitle: 'Farewell (长亭外) · 1=G (5-2弦)',
    key: 'G',
    content: SIMPERHU_SONGBIE_SAMPLE
  },
  {
    id: 'auld-lang-syne',
    title: '友谊地久天长',
    subtitle: 'Auld Lang Syne · 1=G (5-2弦)',
    key: 'G',
    content: SIMPERHU_AULD_LANG_SYNE_SAMPLE
  },
  {
    id: 'ode-to-joy',
    title: '欢乐颂 (练习曲)',
    subtitle: 'Ode to Joy · 1=G (5-2弦)',
    key: 'G',
    content: SIMPERHU_ODE_TO_JOY_SAMPLE
  },
  {
    id: 'blank',
    title: '空白二胡简谱',
    subtitle: 'Blank Erhu Template · 1=D (1-5弦)',
    key: 'D',
    content: SIMPERHU_BLANK_TEMPLATE
  }
];
