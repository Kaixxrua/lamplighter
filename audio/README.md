# 《燃灯者》的声音（audio/）

全片的每一个声音都由这里的代码离线合成（Node），没有采样、外部音频、音色库或 AI 生成的声音。
ffmpeg 只用来测量和出图（ebur128 复核响度、给 PNG 加字），响度归一、限幅、卷积都是自己写的。
所有随机都带种子：同一份代码、同一份时间线，渲出来的文件逐位相同。

> **定稿。** 画面已经锁定（45 镜），这里的数字和 `audio/out/` 里的文件就是交付版本。
> 所有对点都从 CUES 读取，QA 0 处失败、0 处暂定。如果画面再改，用下面的一条命令重渲，再按新结果改这份文件。

## 一条命令：从渲染到全部交付文件

```
nice -n 15 node --no-warnings audio/synth/deliver.mjs --render --final
```

依次运行渲染、QA、交付（两版混音、三轨分轨、回读检查、出图）。几个步骤先后跑，同一时间只有一个进程，全程约 2 分钟。
全部检查通过时退出码为 0，否则为 1，失败的检查列在 `audio/out/deliver/deliver.json` 的 `checks` 里。
`--final` 表示画面已锁定：deliver.json 的 `status` 和两张 levels 图会标成定稿。它有前提：QA 必须是这次渲染的，0 处失败、0 处暂定，
而且每项检查都通过。不满足时拒绝定稿，退出码为 1。不加 `--final` 时一律标「临时」。

## 分步运行

1. **渲染**（temp_mix）

   ```
   nice -n 15 node --no-warnings audio/synth/render.mjs --out audio/out --name temp_mix.wav --stems audio/out/temp_mix/stems --reports audio/out/temp_mix
   ```

   - 读 `film/timeline.json` 和 cue 表（见下）。五段总谱 `score/sec1–sec5.mjs` 把每个声音放到它该在的采样上。
   - 处理链：教堂和小室混响（自己生成的脉冲响应，FFT 分块卷积）→ 20 Hz 高通 → 母带增益 → s12 寂静 → 片尾最后 1 s 淡出 → 真峰值限幅（−1 dBTP）。
   - s12 寂静：[SIL0, AIR0) 精确为零，切点前 3 ms 淡出。
   - 片尾：s50 的 ping 在第 5707 帧，离片尾只有 1.2 s，它 6 s 的混响会被片尾截断。所以最后 1 s 每一轨都用升余弦淡出，最后一个采样正好是零，不会有咔哒声。
   - 输出 `audio/out/temp_mix.wav`：粗混，约 −15.8 LUFS，给 assemble.mjs 配样片用，不是交付文件。
   - 输出 `audio/out/temp_mix/stems/`：三轨，32-bit float，限幅之前。
   - 输出报告：`render.json`、`cuelog.json`、`balance.json`。
2. **QA**

   ```
   nice -n 15 node --no-warnings audio/synth/qa.mjs --dir audio/out/temp_mix
   ```

   结果写在 `audio/out/temp_mix/qa/`：qa.json，加上频谱图、levels 图和对点放大图。
3. **交付**

   ```
   nice -n 15 node --no-warnings audio/synth/deliver.mjs
   ```

   从第 1 步那一次渲染的三轨做出全部交付文件。参数：

   | 参数 | 默认 | 含义 |
   |---|---|---|
   | `--dip` | −1.5 | 高潮压低多少 dB |
   | `--dip-max` | −2 | 压低最多加深到多少 dB |
   | `--lift` | +3 | s30–s34 抬高多少 dB（只在 web 版） |
   | `--limit-max` | 3 | 限幅最多压多少 dB |
   | `--web` | −14 | web 版目标 LUFS |
   | `--cinema` | −24 | cinema 版目标 LUFS |
   | `--final` | 不加 | 画面已锁定：标成定稿（有前提，见上） |

## 交付文件（audio/out/，不进 git）

| 文件 | 内容 |
|---|---|
| `mix_cinema.wav` | −24 LUFS。只乘一个增益，没有限幅，保留全部动态。 |
| `mix_web.wav` | 目标 −14 LUFS，真峰值 ≤ −1 dBTP。片段增益加限幅，限幅最多 3 dB。 |
| `stems/music.wav`、`stems/sfx.wav`、`stems/ambience.wav` | 音乐、音效、氛围三轨，cinema 版的电平。 |
| `deliver/deliver.json` | 参数、增益、限幅统计，每个文件的实测值和检查结果。 |
| `deliver/levels_web.png`、`deliver/levels_cinema.png` | 波形、响度曲线、片段增益、限幅量。 |

- 全部文件都是 48 kHz、24-bit、立体声，长度 11,472,000 个采样（5736 帧 × 2000）。
- 量化到 24-bit 时加 TPDF 抖动（±1 LSB），种子固定，结果逐位可复现。
- 精确为零的采样不加抖动，所以 s12 的数字静音仍然全是零。

**stems 相加 = mix_cinema。** 每一轨都乘上 cinema 的母带增益 g_c，再量化成 24-bit。
mix_cinema 就是这三轨 24-bit 整数逐采样相加的结果。deliver.mjs 写完会回读，逐采样核对，差值必须是 0。

### web 版的母带链

1. **片段增益。**
   - 按 dB 线性过渡，每段至少 0.5 s，尽量落在乐句边界上。
   - 过渡的起止点用镜头起点或渲染日志 cuelog.json 里的事件定位，画面或音乐改动后会跟着移动。
   - 三段如下：
     - **s15 高潮**：在 s14 最后 2 s（它的最后一个和弦）里降下来；s16 切点前 1.5 s 开始升回，到 s16 切点（ping）回到 0。
     - **s44–s45 高潮**：在 s44 第 8 拍到第 10 拍之间降下来，高潮从第 10 拍起；s45 合奏停下后，用 1 s 升回。
     - **s30–s34 抬高**：在 s29→s30 的硬切上直接抬起，只用 10 ms 防爆音，因为暖到冷的突变本身就能盖住它；在 s34 最后 1 s 里回落，到 s35 切点回到 0。
2. **增益到 −14 LUFS。** 限幅器在 −1 dBTP 截顶，最多压 3 dB。所以增益有上限：进入限幅器的最高真峰值不超过 +2 dBTP。
3. **到不了 −14 时。** 压低每次加深 0.1 dB，最多到 `--dip-max`。还到不了，就让限幅停在上限，把差多少记在 deliver.json 的 `web.shortfallLU` 里，不硬压。

### cinema 版

三轨相加，乘 g_c 使整体为 −24 LUFS。没有片段增益，没有限幅。

### 响度计

自己写的，在 `synth/lib/loud.mjs`：
- 积分响度按 ITU-R BS.1770-4（K 加权，门限积分）。
- 瞬时、短时响度和 LRA 按 EBU Tech 3341 / 3342。
- 真峰值用 4× 过采样。

每个交付文件写完都会回读，再用 ffmpeg ebur128 复核一遍，两边差值超过 0.2 就算检查失败。

## cue 表怎么生成

1. **画面导出对点。** 每个镜头模块 `shots/sNN.js` 都导出 CUES，即镜头内各个时刻的秒数。
   `node --no-warnings engine/tools/cues.mjs` 把所有镜头的 CUES 和它们在时间线上的全局帧合成一张 JSON 表。
2. **渲染时读入。** `synth/score/cuesheet.mjs` 的 `loadRows()` 调用这个工具，结果缓存在 `audio/out/cache/cues.json`。
   `render.mjs --cached` 直接用缓存。
3. **总谱按路径取对点，换算成采样。** 例如 `S.cue('s37', 'return')`、`S.cue('s48', 'chord')`。
   采样 = (镜头起始帧 − offset) × 2000 + round(48000 × t)。每个对点都是下面五种之一，日志里记着它的来历：
   - **cue**：CUES 里的一个时刻；
   - **cue + 偏移**：某个 CUES 时刻再加一段写明理由的秒数，例如 s13 风箱「turn.t0 后 0.5 s」；
   - **切点**：镜头在时间线上的第一帧（`@start`）。s21–s26 没有导出切点，蒙太奇的小节线就是它们的切点；
   - **片卡**：`film/timeline.json` 里字卡的某一刻，例如 c1 开始淡出、c3 的第二层；
   - **Span 拍点**：两端都是 CUES 的一段速度（`tempo.mjs` 的 `spanOn`），里面的第 k 拍。
     画面也标了的拍点直接用 CUES，并检查它和拍点相差不超过 6 ms。s43 从 90 BPM 指数加速到 180 BPM，和镜头用的是同一条速度曲线。
4. **渲染写出声音这边的 cue 表**：`audio/out/temp_mix/cuelog.json`。每个同步点一条，记录：
   - 名字、所在分轨、计划采样、秒、帧；
   - 它的来历（上面五种之一），加偏移的还记着理由；
   - 在干声分轨里测到的起音，以及匹配滤波的偏移。
5. **QA 核对。** `qa.mjs` 从原始 cue 行重新推一遍每个对点的目标采样，必须和 cuelog 里的整数完全相等。Span 拍点从它两端的 CUES 重建速度再算。
   结果写进 `qa/qa.json`，逐条的对点核对表写进 `qa/cuetable.tsv`（帧、秒、镜头、名字、来历、目标采样、实排采样、状态）。

## 实测（定稿）

10-10 13:45Z 定稿渲染（画面锁定，45 镜）。1136 处对点全部精确：CUES 1086、CUES 加偏移 7、切点 15、片卡 2、Span 拍点 26。0 处失败，0 处暂定。

| 文件 | I（LUFS） | LRA（LU） | 真峰值（dBTP） | ffmpeg 复核 I / TP | 备注 |
|---|---|---|---|---|---|
| mix_web.wav | −14.08 | 13.9 | −1.00 | −14.1 / −1.0 | 压低 −2.0 dB，抬高 +3 dB，增益 +2.50 dB，限幅最多 3.00 dB；离 −14 差 0.08 LU |
| mix_cinema.wav | −23.99 | 15.9 | −6.71 | −24.0 / −6.7 | 增益 −8.21 dB，无限幅 |
| stems/music.wav | −23.95 | 16.3 | −6.57 | −24.0 / −6.6 | |
| stems/sfx.wav | −35.57 | 21.1 | −16.96 | −35.6 / −17.0 | |
| stems/ambience.wav | −42.99 | 15.8 | −25.87 | −43.0 / −25.9 | |
| temp_mix.wav | −15.91 | 15.7 | −1.00 | −15.9 / −1.0 | 粗混，不是交付文件 |

- web 版限幅超过 1 dB 的时间共 2.91 s，超过 2 dB 的 0.29 s。最重的几处都在两段压低里。
- 两段压低以外，限幅最多 1.87 dB（191.2 s，s44 高潮前）。s14 的全奏也会碰到限幅。
- 压低从 −1.5 dB 试到 −1.8 dB 都不够，到 −1.9 dB 时 I 为 −14.15，所以用到 −2.0 dB。还差的 0.08 LU 按规矩不硬压（已接受）。

## 目录

- `synth/lib/`：
  - 常量和时间基准：`const.mjs`，SR 48000，每帧 2000 个采样，s12 的 SIL0 / AIR0 / SIL1；
  - 带种子的随机数：`rng.mjs`；
  - WAV 读写和 TPDF 量化：`wav.mjs`；
  - FFT、滤波器、FFT 分块卷积、脉冲响应；
  - 响度和限幅：`loud.mjs`；
  - PNG 出图。
- `synth/inst/`：
  - 管风琴（加法合成）；
  - 共振峰合唱和低语；
  - 模态合成的打击乐（钢片琴、玻璃、钟、太鼓、ping）；
  - 噪声和小振荡器做的效果（翻页、呼啸、火花、灰烬……）；
  - 合成器垫底。
- `synth/score/`：
  - cue 表读取：`cuesheet.mjs`；
  - 和声计划：`harmony.mjs`、`orch.mjs`；
  - 速度：`tempo.mjs`；
  - 公共工具：`kit.mjs`；
  - 五段总谱：`sec1–sec5.mjs`。
- `synth/render.mjs`、`synth/qa.mjs`、`synth/deliver.mjs`：渲染、QA、交付。
- `out/`：所有生成物，不进 git。

## 和 engine/tools/master.mjs 的衔接

engine/tools/master.mjs 出母版和发布版，默认读两个文件：
- `audio/out/mix_cinema.wav`：ProRes 母版，PCM 24-bit 原样封装；
- `audio/out/mix_web.wav`：发布版，AAC 320k。

这两个就是 deliver.mjs 写出的文件，长度与时间线一致（239 s）。两版都已经在目标响度上，那边不要再加增益或做响度归一。
