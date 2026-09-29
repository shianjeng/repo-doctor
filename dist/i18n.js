// Interface translations. The scoring engine (lib/doctor.js) stays English and is the source of
// truth; report text is translated here by check id. Missing keys fall back to English.
import { englishView } from './lib/doctor.js';

export const LANGUAGES = { en: 'English', zh: '简体中文', ja: '日本語' };

const UI = {
  en: {
    'meta.title': 'Repo Doctor — A little care for your code.',
    'nav.method': 'The methodology ↗', 'nav.cli': '>_ Try the CLI', 'nav.language': 'Language',
    'hero.eyebrow': 'A CHECKUP FOR YOUR OPEN SOURCE',
    'hero.title': 'Good code deserves<br>a <em>healthy repo.</em>',
    'hero.intro': 'Find what’s missing before your users do. Get a clear diagnosis<br class="desktop"> and a practical prescription for your GitHub repository.',
    'input.label': 'GitHub repository URL or owner/repository', 'input.placeholder': 'Paste a GitHub repo URL or owner/repo',
    'scan.button': 'Check my repo <span>↗</span>', 'scan.busy': 'Checking…',
    'fine': 'Public repos. No sign-up. No AI key. Just useful signals.', 'recent': 'RECENT',
    'welcome.eyebrow': 'SMALL DETAILS. BETTER FIRST IMPRESSIONS.', 'welcome.count': '20 checks / 5 vital signs',
    'vital.Documentation': 'Make the first five minutes easy.', 'vital.Community': 'Leave the door open to contributors.',
    'vital.CI/CD': 'Build trust with every commit.', 'vital.Security': 'Give responsible reports a home.', 'vital.Structure': 'A place for everything.',
    'report.eyebrow': 'THE DIAGNOSIS', 'report.label': 'Repository health report', 'mode.label': 'Report tone', 'mode.doctor': '✚ Doctor', 'mode.roast': '♨ Roast',
    'action.link': '⧉ Copy link', 'action.markdown': '↓ Markdown', 'action.json': '↓ JSON',
    'score.label': 'OVERALL HEALTH', 'score.outOf': 'OUT OF 100', 'score.note': 'A little maintenance goes a long way.',
    'findings.title': 'Your checkup', 'filter.label': 'Filter checks', 'filter.all': 'All', 'filter.warn': 'Needs care', 'filter.pass': 'Passed', 'filter.unknown': 'Unknown',
    'rx.eyebrow': 'A LITTLE TLC FOR YOUR REPO', 'rx.title': 'Your prescription', 'rx.intro': 'Start with the highest-impact fixes. Links open GitHub with the file or setting ready for you to review.', 'rx.issue': '＋ Track fixes in a GitHub issue',
    'badge.eyebrow': 'SHOW IT OFF', 'badge.title': 'Add a badge', 'badge.intro': 'Paste this into your README. It links back to a fresh check of your repo.', 'badge.copy': 'Copy Markdown',
    'cli.eyebrow': 'FEELS AT HOME IN YOUR TERMINAL', 'cli.title': 'Same doctor.<br>Different waiting room.', 'cli.intro': 'Run a check from your terminal.<br>Export JSON or Markdown. Set a CI score threshold.', 'cli.comment': '# From the project directory · Node.js 22+', 'cli.tag': 'Zero runtime dependencies.',
    'method.eyebrow': 'NO MYSTERY NUMBER', 'method.title': 'A transparent second opinion.',
    'method.intro': '20 checks with a total weight of 100. We read the default branch, README, releases, issues, and community metadata directly from GitHub. Every finding comes with its evidence.',
    'method.q1': 'How is the score calculated?',
    'method.a1': 'Documentation 25 · Community 20 · CI/CD 20 · Security 20 · Structure 15. Passed checks earn their weight. A “good first issue” counts only when an issue actually uses the label, because GitHub creates the label by default. Unverified checks are excluded from the denominator and the report is labeled partial. Missing signals are suggestions, not proof of a broken project.',
    'method.q2': 'What does this check — and what doesn’t it?',
    'method.a2': 'We check repository hygiene through metadata, file paths, and README patterns. We do not execute code, verify CI results, measure test coverage, or perform a security audit. Organization-level policies and unconventional layouts may need manual review. A check makes six GitHub API requests.',
    'method.q3': 'What happens to my repository data?',
    'method.a3': 'When this site’s server has a GitHub token, checks run there and results for a repository are cached for up to ten minutes. Otherwise your browser asks GitHub directly (60 requests per hour per IP address). Only public repositories are checked, nothing is stored beyond that short cache, and you are never asked for a token. Private repositories are supported through the CLI.',
    'footer.text': 'Made for the people who make open source.', 'footer.mono': 'A LITTLE CARE GOES A LONG WAY ↗',
    'status.connecting': 'Connecting to GitHub…', 'status.server': 'Checking on the Repo Doctor server…',
    'status.Finding repository': 'Finding repository…', 'status.Reading README, project files, and community signals': 'Reading README, project files, and community signals…',
    'status.done': 'Check complete · {n} signals reviewed', 'status.partial': ' · some data could not be verified',
    'status.quota': ' · {n} GitHub API requests left this hour', 'status.keep': 'The new check failed. The previous report for {repo} remains below.',
    'err.rate_limit': 'GitHub’s hourly request limit has been reached. Please try again after {time}.', 'err.rate_limit_soon': 'GitHub’s hourly request limit has been reached. Please try again later.',
    'err.not_found': 'Repository not found. Check the spelling — only public repositories can be checked here.',
    'err.timeout': 'GitHub took too long to respond. Please try again.', 'err.network': 'Could not reach GitHub. Check your connection and try again.',
    'err.denied': 'GitHub denied this request. Please try again later.', 'err.bad_input': 'Enter owner/repository or a GitHub URL, for example shianjeng/repo-doctor.',
    'err.busy': 'A check is already running. Please wait.',
    'copy.done': 'Copied ✓', 'copy.fail': 'Copy failed', 'copy.badge': 'Copy badge',
    'meta.line': '{language} · {stars} stars · Checked {date}', 'meta.mixed': 'Mixed languages',
    'coverage': '{passed} of {total} checks passed · {coverage}% scoring coverage',
    'status.pass': 'LOOKING GOOD', 'status.warn': 'NEEDS CARE', 'status.unknown': 'UNKNOWN', 'rx.label': 'Prescription:',
    'points': '{n} POINTS', 'rx.none': 'No missing signals detected. Keep your documentation and checks up to date.', 'filter.empty': 'No checks match this filter.',
    'action.recheck': '↻ Check again',
    'changes.since': 'Since your last check on {date}', 'changes.up': '+{n} points', 'changes.down': '−{n} points', 'changes.same': 'same score',
    'changes.fixed': 'Now passing: {list}', 'changes.regressed': 'Newly failing: {list}', 'list.sep': ', ',
    'doc.title': '{repo}: {score}/100 · Repo Doctor',
  },
  zh: {
    'meta.title': 'Repo Doctor — 给你的代码一点关怀',
    'nav.method': '评分方法 ↗', 'nav.cli': '>_ 试试 CLI', 'nav.language': '语言',
    'hero.eyebrow': '为你的开源项目做个体检',
    'hero.title': '好代码，<br>值得一个<em>健康的仓库。</em>',
    'hero.intro': '在用户发现之前，找出仓库缺了什么。<br class="desktop">为你的 GitHub 仓库给出清晰的诊断和实用的处方。',
    'input.label': 'GitHub 仓库地址或 owner/repo', 'input.placeholder': '粘贴 GitHub 仓库地址或 owner/repo',
    'scan.button': '开始体检 <span>↗</span>', 'scan.busy': '检查中…',
    'fine': '仅限公开仓库。无需注册，无需 AI Key，只看真正有用的信号。', 'recent': '最近',
    'welcome.eyebrow': '细节虽小，却决定第一印象', 'welcome.count': '20 项检查 / 5 项指标',
    'vital.Documentation': '让新用户顺利度过最初五分钟。', 'vital.Community': '为贡献者敞开大门。',
    'vital.CI/CD': '让每一次提交都值得信赖。', 'vital.Security': '让安全问题有处可报。', 'vital.Structure': '让一切井井有条。',
    'report.eyebrow': '诊断结果', 'report.label': '仓库健康报告', 'mode.label': '报告语气', 'mode.doctor': '✚ 医生', 'mode.roast': '♨ 吐槽',
    'action.link': '⧉ 复制链接', 'action.markdown': '↓ Markdown', 'action.json': '↓ JSON',
    'score.label': '总体健康度', 'score.outOf': '满分 100', 'score.note': '日常的一点维护，让项目走得更远。',
    'findings.title': '体检项目', 'filter.label': '筛选检查项', 'filter.all': '全部', 'filter.warn': '需要处理', 'filter.pass': '已通过', 'filter.unknown': '未知',
    'rx.eyebrow': '给仓库一点关爱', 'rx.title': '你的处方', 'rx.intro': '从影响最大的修复开始。链接会打开 GitHub，并准备好文件或设置，由你检查后提交。', 'rx.issue': '＋ 用 GitHub Issue 跟踪这些修复',
    'badge.eyebrow': '晒出你的分数', 'badge.title': '添加徽章', 'badge.intro': '把这段 Markdown 粘贴到 README 中，别人点击徽章即可查看你仓库的最新体检结果。', 'badge.copy': '复制 Markdown',
    'cli.eyebrow': '在终端里同样好用', 'cli.title': '同一位医生，<br>换个候诊室。', 'cli.intro': '在终端里运行检查。<br>可导出 JSON 或 Markdown，也可以在 CI 中设置最低分。', 'cli.comment': '# 在项目目录中运行 · Node.js 22+', 'cli.tag': '零运行时依赖。',
    'method.eyebrow': '分数不是黑箱', 'method.title': '透明、可核查的第二意见。',
    'method.intro': '共 20 项检查，总分 100。所有数据都直接从 GitHub 读取，包括默认分支、README、Release、Issue 和社区资料。每个结论都附有依据。',
    'method.q1': '分数是怎么算的？',
    'method.a1': '文档 25 · 社区 20 · CI/CD 20 · 安全 20 · 结构 15。通过的检查项获得相应权重。由于 GitHub 会默认创建 “good first issue” 标签，只有确实有 Issue 使用了该标签才算通过。无法验证的检查项不计入分母，报告会标记为 “检查不完整”。未通过的项目只是改进建议，并不代表项目有问题。',
    'method.q2': '检查什么，不检查什么？',
    'method.a2': '我们根据元数据、文件路径和 README 内容评估仓库的规范程度，不会执行代码、验证 CI 结果、测量测试覆盖率，也不做安全审计。组织级策略和非常规的目录结构可能需要人工确认。每次检查会发送 6 次 GitHub API 请求。',
    'method.q3': '我的仓库数据会怎样处理？',
    'method.a3': '如果本站服务器配置了 GitHub Token，检查会在服务器上运行，同一仓库的结果最多缓存 10 分钟；否则由你的浏览器直接请求 GitHub（每个 IP 每小时 60 次）。只检查公开仓库，除短暂缓存外不保存任何数据，也绝不会向你索要 Token。私有仓库可以通过 CLI 检查。',
    'footer.text': '献给每一位开源创作者。', 'footer.mono': '多一点关爱，走得更远 ↗',
    'status.connecting': '正在连接 GitHub…', 'status.server': '正在 Repo Doctor 服务器上检查…',
    'status.Finding repository': '正在查找仓库…', 'status.Reading README, project files, and community signals': '正在读取 README、项目文件和社区信息…',
    'status.done': '检查完成 · 已检查 {n} 项', 'status.partial': ' · 部分数据无法验证',
    'status.quota': ' · 本小时剩余 {n} 次 GitHub API 请求', 'status.keep': '本次检查失败，下方仍是 {repo} 的上一份报告。',
    'err.rate_limit': '已达到 GitHub 每小时请求上限，请在 {time} 之后再试。', 'err.rate_limit_soon': '已达到 GitHub 每小时请求上限，请稍后再试。',
    'err.not_found': '找不到该仓库。请检查拼写，并确认它是公开仓库。',
    'err.timeout': 'GitHub 响应超时，请重试。', 'err.network': '无法连接 GitHub，请检查网络后重试。',
    'err.denied': 'GitHub 拒绝了这个请求，请稍后再试。', 'err.bad_input': '请输入 owner/repo 或 GitHub 地址，例如 shianjeng/repo-doctor。',
    'err.busy': '正在检查中，请稍候。',
    'copy.done': '已复制 ✓', 'copy.fail': '复制失败', 'copy.badge': '复制徽章',
    'meta.line': '{language} · {stars} 个 Star · 检查于 {date}', 'meta.mixed': '多种语言',
    'coverage': '通过 {passed}/{total} 项 · 评分覆盖率 {coverage}%',
    'status.pass': '良好', 'status.warn': '需要处理', 'status.unknown': '未知', 'rx.label': '处方：',
    'points': '{n} 分', 'rx.none': '没有发现缺失项。记得持续更新文档和检查配置。', 'filter.empty': '没有符合筛选条件的检查项。',
    'action.recheck': '↻ 重新检查',
    'changes.since': '与上次检查（{date}）相比', 'changes.up': '提高 {n} 分', 'changes.down': '下降 {n} 分', 'changes.same': '分数不变',
    'changes.fixed': '新通过：{list}', 'changes.regressed': '新出现的问题：{list}', 'list.sep': '、',
    'doc.title': '{repo}：{score}/100 · Repo Doctor',
  },
  ja: {
    'meta.title': 'Repo Doctor — コードにちょっとしたケアを',
    'nav.method': '評価方法 ↗', 'nav.cli': '>_ CLI を試す', 'nav.language': '言語',
    'hero.eyebrow': 'オープンソースの健康診断',
    'hero.title': '良いコードには、<br><em>健康なリポジトリを。</em>',
    'hero.intro': 'ユーザーに気づかれる前に、足りないものを見つけましょう。<br class="desktop">GitHub リポジトリをわかりやすく診断し、すぐに使える処方箋をお出しします。',
    'input.label': 'GitHub リポジトリの URL または owner/repo', 'input.placeholder': 'GitHub リポジトリの URL または owner/repo を貼り付け',
    'scan.button': '診断する <span>↗</span>', 'scan.busy': '診断中…',
    'fine': '公開リポジトリ対応。登録不要、AI キー不要。本当に役立つ情報だけ。', 'recent': '最近',
    'welcome.eyebrow': '小さな工夫で、第一印象が変わる', 'welcome.count': '20 項目 / 5 つの指標',
    'vital.Documentation': '最初の 5 分をスムーズに。', 'vital.Community': 'コントリビューターを迎え入れる。',
    'vital.CI/CD': 'コミットごとに信頼を築く。', 'vital.Security': '脆弱性報告の窓口を用意する。', 'vital.Structure': 'すべてをあるべき場所に。',
    'report.eyebrow': '診断結果', 'report.label': 'リポジトリ健康レポート', 'mode.label': 'レポートの口調', 'mode.doctor': '✚ ドクター', 'mode.roast': '♨ 辛口',
    'action.link': '⧉ リンクをコピー', 'action.markdown': '↓ Markdown', 'action.json': '↓ JSON',
    'score.label': '総合スコア', 'score.outOf': '100 点満点', 'score.note': '少しの手入れが、大きな違いに。',
    'findings.title': '診断項目', 'filter.label': '項目を絞り込む', 'filter.all': 'すべて', 'filter.warn': '要対応', 'filter.pass': '合格', 'filter.unknown': '不明',
    'rx.eyebrow': 'リポジトリにちょっとしたケアを', 'rx.title': '処方箋', 'rx.intro': '効果の大きいものから始めましょう。リンクを開くと、ファイルや設定が準備された GitHub の画面が表示されます。内容を確認してから保存してください。', 'rx.issue': '＋ GitHub Issue で対応を管理',
    'badge.eyebrow': 'スコアを見せよう', 'badge.title': 'バッジを追加', 'badge.intro': 'この Markdown を README に貼り付けてください。バッジをクリックすると、リポジトリの最新の診断結果が開きます。', 'badge.copy': 'Markdown をコピー',
    'cli.eyebrow': 'ターミナルでも使える', 'cli.title': '同じドクター、<br>別の待合室。', 'cli.intro': 'ターミナルから診断できます。<br>JSON や Markdown で出力し、CI で最低スコアを設定できます。', 'cli.comment': '# プロジェクトのディレクトリで実行 · Node.js 22+', 'cli.tag': 'ランタイム依存ゼロ。',
    'method.eyebrow': 'スコアはブラックボックスではありません', 'method.title': '根拠が見える、セカンドオピニオン。',
    'method.intro': '合計 100 点、20 項目のチェック。デフォルトブランチ、README、リリース、Issue、コミュニティ情報を GitHub から直接読み取ります。すべての結果に根拠を示します。',
    'method.q1': 'スコアはどう計算されますか？',
    'method.a1': 'ドキュメント 25 · コミュニティ 20 · CI/CD 20 · セキュリティ 20 · 構成 15。合格した項目の配点が加算されます。“good first issue” ラベルは GitHub が自動で作成するため、実際に Issue で使われている場合のみ合格です。確認できなかった項目は分母から除外され、レポートは「部分的な診断」と表示されます。未達の項目は提案であり、プロジェクトに問題がある証拠ではありません。',
    'method.q2': '何を診断し、何を診断しませんか？',
    'method.a2': 'メタデータ、ファイルパス、README の内容からリポジトリの整備状況を確認します。コードの実行、CI 結果の検証、テストカバレッジの測定、セキュリティ監査は行いません。組織レベルのポリシーや独自のディレクトリ構成は手動で確認が必要な場合があります。1 回の診断で GitHub API を 6 回呼び出します。',
    'method.q3': 'リポジトリのデータはどう扱われますか？',
    'method.a3': 'サイトのサーバーに GitHub トークンが設定されている場合、診断はサーバーで行われ、結果は最大 10 分間キャッシュされます。それ以外の場合は、ブラウザから GitHub に直接問い合わせます（IP アドレスごとに 1 時間 60 回まで）。対象は公開リポジトリのみで、短いキャッシュ以外は保存せず、トークンを求めることもありません。非公開リポジトリは CLI で診断できます。',
    'footer.text': 'オープンソースをつくる人たちのために。', 'footer.mono': '少しのケアが、遠くまで届く ↗',
    'status.connecting': 'GitHub に接続しています…', 'status.server': 'Repo Doctor のサーバーで診断しています…',
    'status.Finding repository': 'リポジトリを探しています…', 'status.Reading README, project files, and community signals': 'README、ファイル、コミュニティ情報を読み込んでいます…',
    'status.done': '診断完了 · {n} 項目を確認', 'status.partial': ' · 一部のデータを確認できませんでした',
    'status.quota': ' · この 1 時間の GitHub API 残り {n} 回', 'status.keep': '診断に失敗しました。下には {repo} の前回のレポートが表示されています。',
    'err.rate_limit': 'GitHub の 1 時間あたりのリクエスト上限に達しました。{time} 以降にもう一度お試しください。', 'err.rate_limit_soon': 'GitHub の 1 時間あたりのリクエスト上限に達しました。しばらくしてからお試しください。',
    'err.not_found': 'リポジトリが見つかりません。スペルと、公開リポジトリであることをご確認ください。',
    'err.timeout': 'GitHub の応答がタイムアウトしました。もう一度お試しください。', 'err.network': 'GitHub に接続できません。ネットワークを確認してもう一度お試しください。',
    'err.denied': 'GitHub がリクエストを拒否しました。しばらくしてからお試しください。', 'err.bad_input': 'owner/repo または GitHub の URL を入力してください（例：shianjeng/repo-doctor）。',
    'err.busy': '診断中です。しばらくお待ちください。',
    'copy.done': 'コピーしました ✓', 'copy.fail': 'コピーに失敗しました', 'copy.badge': 'バッジをコピー',
    'meta.line': '{language} · スター {stars} · {date} に診断', 'meta.mixed': '複数の言語',
    'coverage': '{passed}/{total} 項目合格 · 採点カバー率 {coverage}%',
    'status.pass': '良好', 'status.warn': '要対応', 'status.unknown': '不明', 'rx.label': '処方：',
    'points': '{n} 点', 'rx.none': '不足している項目はありません。ドキュメントとチェック設定を最新に保ちましょう。', 'filter.empty': '条件に合う項目はありません。',
    'action.recheck': '↻ 再診断',
    'changes.since': '前回の診断（{date}）から', 'changes.up': '{n} 点アップ', 'changes.down': '{n} 点ダウン', 'changes.same': 'スコアは変わらず',
    'changes.fixed': '新たに合格：{list}', 'changes.regressed': '新たに要対応：{list}', 'list.sep': '、',
    'doc.title': '{repo}：{score}/100 · Repo Doctor',
  },
};

const REPORT = {
  zh: {
    category: { Documentation: '文档', Community: '社区', 'CI/CD': 'CI/CD', Security: '安全', Structure: '结构' },
    health: { Healthy: '健康', 'Needs attention': '有待改进', 'Needs care': '亟需改善', 'Partial check': '检查不完整' },
    title: {
      readme: 'README', installation: '安装说明', usage: '使用示例', demo: '演示或预览图', badge: 'CI 状态徽章',
      license: '许可证', contributing: '贡献指南', conduct: '行为准则', templates: 'Issue 模板', 'first-issue': '新手友好 Issue',
      ci: 'CI 配置', tests: '测试文件', releases: '已发布的 Release', security: '安全策略', dependencies: '依赖更新配置',
      'security-automation': '安全扫描工作流', manifest: '项目清单（manifest）', lockfile: '依赖锁文件', layout: '清晰的目录结构', editor: '代码格式化配置',
    },
    fix: {
      readme: '写一份 README，说明项目做什么、给谁用、如何上手。',
      installation: '添加 “安装” 或 “快速开始” 章节，附上经过验证、可直接复制的命令。',
      usage: '在 “用法” 标题下展示一个最小的输入 / 输出示例。',
      demo: '在安装说明上方添加截图、演示 GIF 或在线演示链接，或设置仓库的网站地址。',
      badge: '添加一个链接到工作流结果的 CI 状态徽章。',
      license: '选择合适的开源许可证，并在 LICENSE 中放入完整条款。',
      contributing: '添加 CONTRIBUTING.md，说明环境搭建、检查命令和 Pull Request 流程。',
      conduct: '添加 CODE_OF_CONDUCT.md，并提供可用的私下举报渠道。',
      templates: '在 .github/ISSUE_TEMPLATE/ 中添加 Bug 报告和功能建议模板。',
      'first-issue': '把一个描述清楚的小任务标记为 good first issue，让新人知道从哪里开始。',
      ci: '添加在 push 和 Pull Request 时运行检查的 CI 工作流。',
      tests: '为主要使用流程添加一个聚焦的测试，并在 CI 中运行。',
      releases: '发布一个带版本号的 GitHub Release，附上安装说明和更新内容。',
      security: '添加 SECURITY.md，说明支持的版本和私下报告漏洞的方式。',
      dependencies: '为项目使用的依赖生态配置 Dependabot 或 Renovate。',
      'security-automation': '添加合适的安全扫描工具，或手动确认已开启 GitHub 的默认代码扫描。',
      manifest: '添加标准的包管理或构建配置文件（如 package.json、pyproject.toml），或在文档中说明仓库结构。',
      lockfile: '在适合你的生态和发布方式时，提交依赖锁文件。',
      layout: '把源码、文档或示例放进命名清晰的目录。',
      editor: '添加 .editorconfig 或对应生态的格式化配置。',
    },
    evidence: {
      unknown: '无法从现有的 GitHub 数据中确认这一项。',
      'readme.pass': 'GitHub 返回了非空的 README。', 'readme.warn': '没有找到可读取的 README。',
      installation: '已在 README 中查找安装或快速开始的章节、安装命令和相关链接。', usage: '已在 README 中查找用法、示例或文档章节，以及代码示例和文档链接。',
      'demo.site': '仓库网站：{url}', demo: '已在 README 中查找非徽章的图片、视频或演示链接，并检查了仓库网站字段。',
      badge: '已在 README 中查找可识别的 CI 徽章地址。',
      'license.spdx': 'GitHub 识别为 {spdx}。', license: '已检查 GitHub 元数据和常见的许可证文件；文件存在不代表法律上有效。',
      contributing: '已检查仓库和 GitHub 社区资料中的贡献指南文件。', conduct: '已检查仓库和 GitHub 社区资料中的行为准则文件。',
      templates: '已查找 Issue 模板和 Issue 表单。',
      'first-issue.disabled': '仓库关闭了 Issue 功能，新人无从下手。', 'first-issue': '查找了至少一个带 “good first issue” 标签的 Issue（开启或关闭均可）。GitHub 默认会创建这个标签，所以只有标签本身不算。',
      ci: '识别到了自动化配置文件，但未验证工作流是否运行或通过。', tests: '已查找常见的测试路径和文件名；未测量覆盖率和正确性。',
      'releases.tag': '最新正式版本：{tag}。', releases: '没有找到已发布的正式 GitHub Release（非草稿、非预发布）。',
      security: '已在仓库及其所有者的 .github 仓库中查找 SECURITY.md 或同类安全策略文件。', dependencies: '已查找 Dependabot 或 Renovate 配置。组织级设置在这里不可见。',
      'security-automation': '根据工作流文件名判断，属于启发式检查。默认设置和组织级扫描可能不可见。',
      manifest: '已查找可识别的包管理或构建清单文件。',
      'lockfile.na': '检测到的生态不需要锁文件，不扣分。', lockfile: '已查找常见的锁文件和固定版本的依赖文件。部分库会有意不提交锁文件。',
      layout: '已查找常见的源码、文档和示例目录，以及文件是否分布在多个顶层目录中。', editor: '已查找常见的格式化 / Lint 配置文件。',
      inherited: '继承自 {source}。没有自己文件的仓库，GitHub 会自动使用它。',
    },
    actions: {
      'Create README.md on GitHub': '在 GitHub 上创建 README.md', 'Edit README on GitHub': '在 GitHub 上编辑 README',
      'Choose a license on GitHub': '在 GitHub 上选择许可证', 'Create CONTRIBUTING.md on GitHub': '在 GitHub 上创建 CONTRIBUTING.md',
      'Add a code of conduct on GitHub': '在 GitHub 上添加行为准则', 'Set up issue templates on GitHub': '在 GitHub 上设置 Issue 模板',
      'Open a good first issue on GitHub': '在 GitHub 上新建 good first issue', 'Create a CI workflow on GitHub': '在 GitHub 上创建 CI 工作流',
      'Choose a workflow on GitHub': '在 GitHub 上选择工作流', 'Draft a release on GitHub': '在 GitHub 上起草 Release',
      'Create SECURITY.md on GitHub': '在 GitHub 上创建 SECURITY.md', 'Create dependabot.yml on GitHub': '在 GitHub 上创建 dependabot.yml',
      'Open code security settings': '打开代码安全设置', 'Create .editorconfig on GitHub': '在 GitHub 上创建 .editorconfig',
    },
    notes: {
      truncated: 'GitHub 截断了文件树。未看到的文件记为 “未知”，不算缺失。',
      community: 'GitHub 社区资料不可用（私有仓库通常如此），未检查从组织继承的社区文件。',
      archived: '该仓库已归档，建议可能不符合它的维护目标。', fork: '该仓库是 Fork，社区文件可能在上游项目中。',
      description: 'About 简介太短或缺失。请说明项目的用途和目标用户（不计分）。', topics: '没有设置仓库 Topics。Topics 有助于别人在 GitHub 搜索中发现项目（不计分）。',
      source: '{source} 请求失败：{error}',
    },
    sources: { tree: '文件树', readme: 'README', community: '社区资料', release: 'Release', firstIssues: 'good first issue', inherited: '所有者的 .github 仓库' },
    export: {
      checked: '检查时间', coverage: '已验证的评分权重', category: '类别', score: '分数', unknown: '未知',
      checks: '检查项', fixes: '修复建议', none: '没有发现缺失项。', notes: '备注',
      issueOne: 'Repo Doctor 建议了 1 项仓库改进', issueMany: 'Repo Doctor 建议了 {n} 项仓库改进',
      issueIntro: 'Repo Doctor 于 {date} 为本仓库打出 **{score}/100** 分（{health}）。', issueFooter: '由 [Repo Doctor]({url}) v{version} 生成。',
    },
    roast: {
      readme: '你的代码加入了证人保护计划。写个 README，大家才知道它是干什么的。',
      ci: '没有 CI？真勇敢。每次合并都像在走没有安全绳的钢丝。',
      security: '你的仓库有大门，却没装报告漏洞的门铃。给善意的黑客留个敲门的地方吧。',
      license: '没有许可证就等于 “保留所有权利”。你建了个游乐场，又在外面围了一圈栅栏。',
      tests: '“在我电脑上能跑” 已经扛下了太多，让测试来分担一点吧。',
      contributing: '你邀请全世界来协作，却忘了告诉大家该怎么参与。',
      installation: '项目很棒。要是有人知道怎么安装就更好了。',
      usage: '装好了！然后呢……全靠猜。告诉大家到底该怎么用吧。',
      releases: '没有 Release，只有一个 main 分支和满心祈祷。打个版本标签吧，未来的你会感谢现在的你。',
      demo: 'README 写了上千字，却一张图都没有。给你的项目来个特写吧。',
      dependencies: '你的依赖正像牛奶一样慢慢变质，却没人看保质期。交给机器人盯着吧。',
      partial: '化验结果还不完整。吐槽也得讲证据。',
      minor: '只剩一些零碎的小事了。这么爱干净的仓库，实在不好下嘴吐槽。',
      clean: '完美得让人有点恼火，这下真不知道该吐槽什么了。',
    },
    disclaimer: '以上是反映仓库规范程度的信号，不是安全审计，也不代表代码质量。文件检测基于经验规则，不验证 CI 结果和测试覆盖率。',
  },
  ja: {
    category: { Documentation: 'ドキュメント', Community: 'コミュニティ', 'CI/CD': 'CI/CD', Security: 'セキュリティ', Structure: '構成' },
    health: { Healthy: '健康', 'Needs attention': '要注意', 'Needs care': '要改善', 'Partial check': '部分的な診断' },
    title: {
      readme: 'README', installation: 'インストール手順', usage: '使用例', demo: 'デモ・プレビュー', badge: 'CI ステータスバッジ',
      license: 'ライセンス', contributing: 'コントリビューションガイド', conduct: '行動規範', templates: 'Issue テンプレート', 'first-issue': '初心者向け Issue',
      ci: 'CI 設定', tests: 'テストファイル', releases: '公開済みリリース', security: 'セキュリティポリシー', dependencies: '依存関係の更新設定',
      'security-automation': 'セキュリティスキャンの設定', manifest: 'プロジェクトマニフェスト', lockfile: 'ロックファイル', layout: '整理されたディレクトリ構成', editor: 'フォーマット設定',
    },
    fix: {
      readme: 'プロジェクトの内容、対象ユーザー、始め方を説明する README を書きましょう。',
      installation: '「インストール」または「クイックスタート」の節を追加し、動作確認済みのコマンドをそのままコピーできるようにしましょう。',
      usage: '「使い方」の見出しの下に、最小限の入力と出力の例を載せましょう。',
      demo: 'インストール手順の上にスクリーンショット、デモ GIF、ライブデモのリンクを追加するか、リポジトリのウェブサイトを設定しましょう。',
      badge: 'ワークフローの結果にリンクする CI ステータスバッジを追加しましょう。',
      license: '適切なオープンソースライセンスを選び、LICENSE に全文を置きましょう。',
      contributing: '環境構築、チェック方法、プルリクエストの流れを書いた CONTRIBUTING.md を追加しましょう。',
      conduct: 'CODE_OF_CONDUCT.md と、実際に使える非公開の報告窓口を用意しましょう。',
      templates: '.github/ISSUE_TEMPLATE/ にバグ報告と機能要望のテンプレートを追加しましょう。',
      'first-issue': '小さく、説明の明確なタスクに good first issue ラベルを付けて、初めての人が参加しやすくしましょう。',
      ci: 'プッシュとプルリクエストでチェックを実行する CI ワークフローを追加しましょう。',
      tests: '主要な使い方をカバーするテストを追加し、CI で実行しましょう。',
      releases: 'インストール方法と変更点を記載したバージョン付きの GitHub リリースを公開しましょう。',
      security: 'サポート対象のバージョンと非公開の脆弱性報告方法を書いた SECURITY.md を追加しましょう。',
      dependencies: '使用しているエコシステム向けに Dependabot または Renovate を設定しましょう。',
      'security-automation': '適切なセキュリティスキャナーを追加するか、GitHub のデフォルト設定が有効か手動で確認しましょう。',
      manifest: 'package.json や pyproject.toml などの標準的なパッケージ・ビルド設定を追加するか、リポジトリの構成を説明しましょう。',
      lockfile: 'エコシステムや配布方法に合う場合は、ロックファイルをコミットしましょう。',
      layout: 'ソース、ドキュメント、サンプルをわかりやすい名前のディレクトリにまとめましょう。',
      editor: '.editorconfig またはエコシステムに合ったフォーマッターの設定を追加しましょう。',
    },
    evidence: {
      unknown: '取得できた GitHub のデータでは確認できませんでした。',
      'readme.pass': 'GitHub から空でない README が返されました。', 'readme.warn': '読み取れる README が見つかりませんでした。',
      installation: 'README でインストールやクイックスタートの見出し、コマンド、リンクを確認しました。', usage: 'README で使い方・例・ドキュメントの見出し、コード例、ドキュメントへのリンクを確認しました。',
      'demo.site': 'リポジトリのウェブサイト：{url}', demo: 'README でバッジ以外の画像、動画、デモリンクを確認し、ウェブサイト欄もチェックしました。',
      badge: 'README で既知の CI バッジの URL を確認しました。',
      'license.spdx': 'GitHub が {spdx} と判定しました。', license: 'GitHub のメタデータと一般的なライセンスファイルを確認しました。ファイルがあっても法的な有効性は保証されません。',
      contributing: 'リポジトリと GitHub のコミュニティ情報でコントリビューションガイドを確認しました。', conduct: 'リポジトリと GitHub のコミュニティ情報で行動規範を確認しました。',
      templates: 'Issue テンプレートと Issue フォームを確認しました。',
      'first-issue.disabled': 'Issue が無効になっているため、初めての人が参加するきっかけがありません。', 'first-issue': '“good first issue” ラベル付きの Issue（オープン・クローズ問わず）を探しました。ラベル自体は GitHub が自動で作成するため、ラベルだけでは合格になりません。',
      ci: '自動化の設定ファイルを検出しました。ワークフローの実行や成功は確認していません。', tests: '一般的なテストのパスとファイル名を確認しました。カバレッジや正しさは測定していません。',
      'releases.tag': '最新の正式リリース：{tag}。', releases: '公開済みの正式な GitHub リリース（下書き・プレリリース以外）が見つかりませんでした。',
      security: 'リポジトリとオーナーの .github リポジトリで SECURITY.md または同等のポリシーファイルを確認しました。', dependencies: 'Dependabot または Renovate の設定を確認しました。組織レベルの設定はここでは見えません。',
      'security-automation': 'ワークフローのファイル名による推定です。デフォルト設定や組織レベルのスキャナーは見えない場合があります。',
      manifest: '既知のパッケージ/ビルドのマニフェストを確認しました。',
      'lockfile.na': '検出されたエコシステムではロックファイルは不要なため、減点しません。', lockfile: '既知のロックファイルとバージョン固定の依存ファイルを確認しました。意図的に省略するライブラリもあります。',
      layout: '一般的なソース・ドキュメント・サンプルのディレクトリと、複数のトップレベルディレクトリへの整理を確認しました。', editor: '一般的なフォーマッター/リンターの設定ファイルを確認しました。',
      inherited: '{source} から継承しています。独自のファイルがないリポジトリには、GitHub がこれを適用します。',
    },
    actions: {
      'Create README.md on GitHub': 'GitHub で README.md を作成', 'Edit README on GitHub': 'GitHub で README を編集',
      'Choose a license on GitHub': 'GitHub でライセンスを選ぶ', 'Create CONTRIBUTING.md on GitHub': 'GitHub で CONTRIBUTING.md を作成',
      'Add a code of conduct on GitHub': 'GitHub で行動規範を追加', 'Set up issue templates on GitHub': 'GitHub で Issue テンプレートを設定',
      'Open a good first issue on GitHub': 'GitHub で good first issue を作成', 'Create a CI workflow on GitHub': 'GitHub で CI ワークフローを作成',
      'Choose a workflow on GitHub': 'GitHub でワークフローを選ぶ', 'Draft a release on GitHub': 'GitHub でリリースを作成',
      'Create SECURITY.md on GitHub': 'GitHub で SECURITY.md を作成', 'Create dependabot.yml on GitHub': 'GitHub で dependabot.yml を作成',
      'Open code security settings': 'コードセキュリティの設定を開く', 'Create .editorconfig on GitHub': 'GitHub で .editorconfig を作成',
    },
    notes: {
      truncated: 'GitHub がファイルツリーを省略しました。見えなかったファイルは「不明」とし、欠落とはみなしません。',
      community: 'GitHub のコミュニティ情報を取得できません（非公開リポジトリでは通常の動作です）。組織から継承したファイルは確認していません。',
      archived: 'このリポジトリはアーカイブされています。提案がメンテナンス方針に合わない場合があります。', fork: 'このリポジトリはフォークです。コミュニティ関連のファイルはフォーク元にあるかもしれません。',
      description: 'About の説明が短いか、ありません。プロジェクトの目的と対象を書きましょう（採点対象外）。', topics: 'Topics が設定されていません。Topics は GitHub 検索で見つけてもらうのに役立ちます（採点対象外）。',
      source: '{source} の取得に失敗：{error}',
    },
    sources: { tree: 'ファイルツリー', readme: 'README', community: 'コミュニティ情報', release: 'リリース', firstIssues: 'good first issue', inherited: 'オーナーの .github リポジトリ' },
    export: {
      checked: '診断日時', coverage: '確認できた配点', category: 'カテゴリ', score: 'スコア', unknown: '不明',
      checks: '診断項目', fixes: '修正の提案', none: '不足している項目はありません。', notes: '補足',
      issueOne: 'Repo Doctor からの改善提案（1 件）', issueMany: 'Repo Doctor からの改善提案（{n} 件）',
      issueIntro: 'Repo Doctor による {date} の診断結果：**{score}/100**（{health}）。', issueFooter: '[Repo Doctor]({url}) v{version} で作成しました。',
    },
    roast: {
      readme: 'あなたのコードは証人保護プログラムに入ったようです。README があれば、何をするものか分かるのですが。',
      ci: 'CI なし？ 大胆ですね。毎回のマージが、命綱なしの綱渡りです。',
      security: '玄関はあるのに、脆弱性を知らせる呼び鈴がありません。善意のハッカーがノックできる場所を用意しましょう。',
      license: 'ライセンスがなければ「無断使用禁止」と同じ。遊び場をつくったのに、周りをフェンスで囲っているようなものです。',
      tests: '「自分の環境では動く」に頼りすぎです。少しはテストに任せましょう。',
      contributing: '世界中を共同作業に招待したのに、道案内を送り忘れています。',
      installation: '素晴らしいプロジェクトです。インストール方法さえ分かれば、の話ですが。',
      usage: 'インストールできた！ で、次は……勘で使うしかありません。何を入力すればいいか教えてあげましょう。',
      releases: 'リリースなし。あるのは main ブランチと祈りだけ。タグを打てば、未来の自分が感謝します。',
      demo: 'README は長いのに、画像が一枚もありません。スクリーンショットで主役を見せてあげましょう。',
      dependencies: '依存関係が牛乳のように傷んでいくのに、誰も賞味期限を見ていません。チェックはボットに任せましょう。',
      partial: '検査結果が揃っていません。辛口にも証拠が必要です。',
      minor: '残るは細かい作業だけ。ここまで手入れが行き届いていると、ツッコミようがありません。',
      clean: '悔しいほど完璧です。これでは辛口のネタがありません。',
    },
    disclaimer: 'この結果はリポジトリの整備状況を示す目安であり、セキュリティ監査やコード品質を保証するものではありません。ファイルの検出は推定に基づくもので、CI の結果やテストカバレッジは検証していません。',
  },
};

export function detectLanguage(search = location.search, stored = null, browser = navigator.languages || [navigator.language]) {
  const fromUrl = new URLSearchParams(search).get('lang');
  for (const candidate of [fromUrl, stored, ...browser]) {
    const code = String(candidate || '').toLowerCase().slice(0, 2);
    if (code in LANGUAGES) return code;
  }
  return 'en';
}

const fill = (text, params) => text.replace(/\{(\w+)\}/g, (_, key) => params[key] ?? '');

export function t(lang, key, params = {}) {
  return fill(UI[lang]?.[key] ?? UI.en[key] ?? key, params);
}

// Error objects from lib/doctor.js or /api/check carry a code; messages without one stay as they are.
export function errorText(lang, { code, message, resetAt } = {}) {
  if (code === 'rate_limit') return resetAt ? t(lang, 'err.rate_limit', { time: new Date(resetAt).toLocaleTimeString(lang, { hour: '2-digit', minute: '2-digit' }) }) : t(lang, 'err.rate_limit_soon');
  if (code && UI.en[`err.${code}`]) return t(lang, `err.${code}`);
  return message || '';
}

const ERROR_CODES = [[/rate limit reached(?:\. It resets at (\S+)\.)?/, 'rate_limit'], [/^Repository not found/, 'not_found'], [/timed out/, 'timeout'], [/Could not reach GitHub/, 'network'], [/denied this request/, 'denied']];
const errorFromMessage = (lang, message) => {
  for (const [pattern, code] of ERROR_CODES) {
    const match = message.match(pattern);
    if (match) return errorText(lang, { code, message, resetAt: match[1] });
  }
  return message;
};

function evidenceKey(check) {
  if (check.status === 'unknown') return ['unknown', {}];
  const text = check.evidence;
  const inherited = text.match(/^Inherited from (.+?): (.+?)\. GitHub/);
  if (inherited) return ['inherited', { source: `${inherited[1]}/${inherited[2]}` }];
  const variants = {
    readme: () => [`readme.${check.status}`, {}],
    demo: () => text.startsWith('Repository website: ') ? ['demo.site', { url: text.slice(20) }] : ['demo', {}],
    license: () => /^GitHub identified (.+)\.$/.test(text) ? ['license.spdx', { spdx: text.match(/^GitHub identified (.+)\.$/)[1] }] : ['license', {}],
    'first-issue': () => [/disabled/.test(text) ? 'first-issue.disabled' : 'first-issue', {}],
    releases: () => /^Latest non-prerelease: (.+)\.$/.test(text) ? ['releases.tag', { tag: text.match(/^Latest non-prerelease: (.+)\.$/)[1] }] : ['releases', {}],
    lockfile: () => [text.startsWith('Not required') ? 'lockfile.na' : 'lockfile', {}],
  };
  return (variants[check.id] || (() => [check.id, {}]))();
}

// Translated view of a report for rendering and exports (same shape as englishView in lib/doctor.js).
export function localizeReport(lang, report) {
  const r = REPORT[lang];
  if (!r) return englishView(report);
  const noteKeys = [
    [/^GitHub truncated/, 'truncated'], [/community profile is unavailable/, 'community'], [/is archived/, 'archived'],
    [/is a fork/, 'fork'], [/About description/, 'description'], [/No repository topics/, 'topics'],
  ];
  const note = text => {
    const known = noteKeys.find(([pattern]) => pattern.test(text));
    if (known) return r.notes[known[1]];
    const failed = text.match(/^(\w+): (.*)$/s);
    return failed ? fill(r.notes.source, { source: r.sources[failed[1]] || failed[1], error: errorFromMessage(lang, failed[2]) }) : text;
  };
  return {
    text: { ...englishView(report).text, ...r.export },
    category: name => r.category[name] || name,
    health: r.health[report.health] || report.health,
    disclaimer: r.disclaimer,
    notes: report.notes.map(note),
    check: c => {
      const [key, params] = evidenceKey(c);
      return {
        title: r.title[c.id] || c.title, fix: r.fix[c.id] || c.fix,
        evidence: r.evidence[key] ? fill(r.evidence[key], params) : c.evidence,
        actionLabel: c.action ? r.actions[c.action.label] || c.action.label : undefined,
      };
    },
  };
}

export function roastText(lang, id, english) {
  return REPORT[lang]?.roast[id] || english;
}

export function categoryName(lang, name) {
  return REPORT[lang]?.category[name] || name;
}
