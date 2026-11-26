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

export const SIMPERHU_ERQUAN_SAMPLE = `@title: 二泉映月 (片段)
@subtitle: Moon Reflected on Second Spring
@composer: 华彦钧 (阿炳)
@arranger: SimpErhu Web 简谱
@key: 1=G
@strings: 5-2
@time: 4/4
@tempo: 54
@expression: 慢板 深沉如诉 Adagio

S: 引子 (Introduction)
| 5,{pull,0,in,mp} - (6,{push,一,vib} 1{二}) | 2{pull,三,sd,mf} - (1{push,二} 6,{一}) | 5,{pull,0,vib,fermata} - - - ||

S: 主题 (Main Theme)
| 5,{pull,0,in,mp} (6,{push,一} 1{二}) 2.{pull,三,vib}3_{四} | (5{push,一,out,mf} 6_5_) 3{pull,三,in,sd} 2{push,二} | 1{pull,一,vib} (2_3_ 2_1_) 6,{push,一} 5,{pull,0} | 6,{push,一,su} - 5,{pull,0,dim} - |
| 5{pull,一,out,mf} (6_1'_ 6_5_) 3{push,三,vib} 5{pull,一} | 6{push,二,vib,f} (5_3_ 2_3_) 2{pull,三,in,sd} - | 1{push,二,vib} (6,_1_ 2_3_) 5,{pull,0,mp} (6,_1_) | 5,{push,0,vib,fermata} - - - |]

T: 演奏提示：内弦定D、外弦定A（5-2弦）；滑音与揉弦结合运弓强弱变化，表现深沉沧桑的韵味。`;

export const SIMPERHU_JASMINE_SAMPLE = `@title: 茉莉花
@subtitle: Jasmine Flower (二胡独奏)
@composer: 江苏民歌
@arranger: SimpErhu 简谱编配
@key: 1=D
@strings: 1-5
@time: 4/4
@tempo: 82
@expression: 柔美抒情地 Moderato

S: 主题 (Theme)
| 3{pull,三,in,mp} (3_5_ 6_1'_) 1'{push,三,out,vib} 6_5_ | 5{pull,0,out} (6_5_) 3{push,三,in,vib} - | 3{pull,三} (3_5_ 6_1'_) 1'{push,三,out} 6_5_ | 5{pull,0} (6_5_) 3{push,三,in} - |
L: 好 一 朵 美 丽 的 茉 莉 花 ， 好 一 朵 美 丽 的 茉 莉 花 ，
| 5{pull,0,out,mf} 5{push,0} 5{pull,0} (3_5_) | 6{push,一,vib} 6{pull,一} 5{push,0,dim} - | 3{pull,三,in} (2_3_) 5{push,0,out} (3_2_) | 1{pull,0,in,vib} (2_1_) 6,{push,一,sd} - |
L: 芬 芳 美 丽 满 枝 桠 ， 又 香 又 白 人 人 夸 。
| 3{pull,三,in,mp} (2_1_) 3{push,三} (2_1_) | 2{pull,二,vib} (3_5_) 3{push,三} 2{pull,二} | 1{push,0,in,su} (2_3_) 2{pull,二,rit} (1_6,_) | 1{push,0,in,vib,fermata} - - - |]
L: 让 我 来 将 你 摘 下 ， 送 给 别 人 家 ， 茉 莉 花 呀 茉 莉 花 。`;

export const SIMPERHU_SAIMA_SAMPLE = `@title: 赛马 (主题选段)
@subtitle: Horse Racing
@composer: 黄海怀
@arranger: SimpErhu 简谱
@key: 1=F
@strings: 6-3
@time: 2/4
@tempo: 136
@expression: 热烈奔放地 Allegro

S: 第一段 奔腾主题 (Galloping Theme)
|: 6,{pull,0,in,f} 6,__6,__ 6,_6,_ | 6,__6,__ 6,_6,_ 1{push,二,accent} 2{pull,三} | 3{push,0,out,stacc} 3__3__ 3_2_ | 1_2_ 3_5_ 6{pull,三,vib,f} - |
| 6{push,三,out} 5__6__ 5_3_ | 2_3_ 2_1_ 6,{pull,0,in} 1{push,二} | 2{pull,三,su} 3_2_ 1_6,_ | 6,{push,0,in,stacc} 0 0 0 :|

S: 第二段 拨弦与颤弓 (Pizzicato & Tremolo)
| 3{pizz,0,out,mf} 5{pizz,二} 6{pizz,三} 5{pizz,二} | 3{pizz,0} 2{pizz,三,in} 1{pizz,二} 6,{pizz,0} | 6{pull,三,out,trem,ff} - | 6{push,三,trem} - |]

T: 提示：16分音符采用分弓急促运弓，第二段拨弦（+）颗粒饱满，尾音用急促颤弓推向高潮。`;

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

export const SIMPERHU_TEMPLATES: SimpErhuTemplate[] = [
  {
    id: 'erquan',
    title: '二泉映月 (片段)',
    subtitle: 'Moon Reflected on Second Spring · 1=G (5-2弦)',
    key: 'G',
    content: SIMPERHU_ERQUAN_SAMPLE
  },
  {
    id: 'jasmine',
    title: '茉莉花 (带歌词)',
    subtitle: 'Jasmine Flower with Lyrics · 1=D (1-5弦)',
    key: 'D',
    content: SIMPERHU_JASMINE_SAMPLE
  },
  {
    id: 'saima',
    title: '赛马 (主题选段)',
    subtitle: 'Horse Racing · 1=F (6-3弦)',
    key: 'F',
    content: SIMPERHU_SAIMA_SAMPLE
  },
  {
    id: 'blank',
    title: '空白二胡简谱',
    subtitle: 'Blank Erhu Template · 1=D (1-5弦)',
    key: 'D',
    content: SIMPERHU_BLANK_TEMPLATE
  }
];
