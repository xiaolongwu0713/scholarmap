import { Metadata } from 'next';
import Link from 'next/link';
import { UnifiedNavbar } from '@/components/UnifiedNavbar';
import { Footer } from '@/components/landing/Footer';
import { PLANS, REFUND_DAYS } from '@/lib/site';

const TITLE = 'LabScout - 按研究方向在地图上找全球博士导师与实验室';
const DESCRIPTION =
  '输入你的研究方向，LabScout 自动检索 PubMed 论文，把全球活跃研究者按国家、城市、机构标在地图上。生物医学方向博士/博后申请、套磁找导师必备。免费试用。';

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  keywords: ['找博士导师', '套磁', '申请博士', '出国读博', '博士申请 导师', '博后申请', '生物医学 实验室', '全球实验室地图'],
  alternates: {
    canonical: '/zh',
    languages: { en: '/', 'zh-CN': '/zh' },
  },
  openGraph: {
    type: 'website',
    locale: 'zh_CN',
    url: '/zh',
    siteName: 'LabScout',
    title: TITLE,
    description: DESCRIPTION,
    images: [{ url: '/landing_page_figures_optimized/0.webp', width: 1200, height: 630, alt: '全球研究者分布地图' }],
  },
};

// Researcher/country counts from the live field pages (2026-10-01), rounded down so they stay true after rebuilds.
const FIELDS = [
  { slug: 'car-t-cell-therapy', name: 'CAR-T 细胞治疗', stats: '6,000+ 位研究者 · 60 国' },
  { slug: 'single-cell-sequencing', name: '单细胞测序', stats: '4,400+ 位研究者 · 42 国' },
  { slug: 'brain-computer-interface', name: '脑机接口', stats: '2,000+ 位研究者 · 64 国' },
  { slug: 'cancer-immunotherapy', name: '肿瘤免疫治疗' },
  { slug: 'alzheimers-disease', name: '阿尔茨海默病' },
  { slug: 'crispr-gene-editing', name: 'CRISPR 基因编辑' },
  { slug: 'organoids', name: '类器官' },
  { slug: 'ai-drug-discovery', name: 'AI 药物发现' },
  { slug: 'gut-microbiome', name: '肠道微生物' },
  { slug: 'protein-design', name: '蛋白质设计' },
];

const PAINS = [
  '用 Google Scholar 一篇篇翻，翻不完，也不知道漏了谁',
  '只知道几位大牛，不知道同方向还有哪些中小实验室',
  '想去某个国家或城市，却不知道当地谁在做你的方向',
];

const STEPS = [
  ['描述方向', '中英文均可，例如"肿瘤微环境中的巨噬细胞代谢"。'],
  ['自动检索', 'AI 生成检索式，从 PubMed 拉取相关论文。'],
  ['看地图', '按国家 → 城市 → 机构 → 研究者逐层查看，每个人附代表论文。'],
];

const FAQS = [
  ['国内能打开吗？', '可以直接访问，地图加载可能稍慢。'],
  ['适合哪些专业？', '数据来自 PubMed，覆盖生物、医学、药学、神经科学、生物工程等；纯工科和人文社科暂不适用。'],
  ['能看出导师是否招生吗？', '不能。我们显示的是近年在这个方向发表论文的研究者，招生情况请看导师主页或直接发邮件询问。'],
  ['怎么付款？', '微信支付（3 个月卡）、银行卡、PayPal、Apple Pay、Google Pay。'],
  ['可以退款吗？', `首次付款 ${REFUND_DAYS} 天内无理由全额退款。`],
];

const REGISTER = '/auth/register';
const btnPrimary = 'inline-block rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700';
const btnSecondary =
  'inline-block rounded-lg border border-gray-300 bg-white px-6 py-3 font-semibold text-gray-900 hover:bg-gray-50';

export default function ChineseLandingPage() {
  const { free, pro } = PLANS;
  return (
    <div lang="zh-CN">
      <UnifiedNavbar variant="landing" />

      <main className="min-h-screen bg-gradient-to-b from-white to-gray-50 pt-24 pb-12">
        <div className="container mx-auto px-4 max-w-5xl">
          <header className="mb-14 text-center">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 mb-4 leading-tight">
              按研究方向，找到全球做这个方向的导师和实验室
            </h1>
            <p className="text-lg sm:text-xl text-gray-600 leading-relaxed max-w-3xl mx-auto mb-8">
              写一句话描述你的研究兴趣，LabScout 从 PubMed 论文里找出全世界正在发表这个方向论文的研究者，
              按国家、城市、机构标在地图上。
            </p>
            <div className="flex flex-wrap justify-center gap-4 mb-4">
              <Link href={REGISTER} className={btnPrimary}>免费试用</Link>
              <Link href="/research-jobs/car-t-cell-therapy" className={btnSecondary}>先看一个例子（CAR-T 地图）→</Link>
            </div>
            <p className="text-sm text-gray-500">
              免费账号每周 {free.searchesPerWeek} 次自定义搜索 · 公开领域地图不限次数浏览
            </p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/landing_page_figures_optimized/0-md.webp"
              alt="全球研究者分布地图示意"
              width={1024}
              height={683}
              className="mx-auto mt-10 w-full max-w-3xl rounded-xl border border-gray-200 shadow-sm"
            />
          </header>

          <section className="mb-14">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">套磁最费时间的，是找人</h2>
            <ul className="grid gap-4 md:grid-cols-3">
              {PAINS.map((p) => (
                <li key={p} className="rounded-xl border border-gray-200 bg-white p-5 text-gray-700 shadow-sm">{p}</li>
              ))}
            </ul>
          </section>

          <section className="mb-14">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">三步出图</h2>
            <ol className="grid gap-5 md:grid-cols-3">
              {STEPS.map(([title, body], i) => (
                <li key={title} className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                  <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 font-bold text-white">
                    {i + 1}
                  </div>
                  <h3 className="font-bold text-gray-900 mb-1">{title}</h3>
                  <p className="text-gray-600">{body}</p>
                </li>
              ))}
            </ol>
          </section>

          <section className="mb-14">
            <h2 className="text-2xl font-bold text-gray-900 mb-2 text-center">热门方向，直接看</h2>
            <p className="text-center text-sm text-gray-500 mb-6">地图页面为英文界面</p>
            <div className="grid gap-3 grid-cols-2 md:grid-cols-5">
              {FIELDS.map((f) => (
                <Link
                  key={f.slug}
                  href={`/research-jobs/${f.slug}`}
                  className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm hover:border-blue-400"
                >
                  <div className="font-semibold text-gray-900">{f.name}</div>
                  {f.stats && <div className="mt-1 text-xs text-gray-500">{f.stats}</div>}
                </Link>
              ))}
            </div>
            <p className="mt-4 text-center">
              <Link href="/research-jobs" className="text-blue-600 hover:underline">查看全部 65 个方向 →</Link>
            </p>
          </section>

          <section className="mb-14">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">价格</h2>
            <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
              <table className="w-full min-w-[520px] text-left text-sm sm:text-base">
                <thead className="bg-gray-50 text-gray-900">
                  <tr>
                    <th className="p-4" />
                    <th className="p-4">免费</th>
                    <th className="p-4 text-blue-700">Pro 3 个月卡<div className="text-xs font-normal">推荐申请季</div></th>
                    <th className="p-4">Pro 月付</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-gray-700">
                  <tr>
                    <td className="p-4 font-medium">价格</td>
                    <td className="p-4">¥0</td>
                    <td className="p-4">约 ¥{pro.passPriceCny}，一次性付费，<strong>不自动续费</strong></td>
                    <td className="p-4">约 ¥{pro.monthlyPriceCny}/月</td>
                  </tr>
                  <tr>
                    <td className="p-4 font-medium">自定义搜索</td>
                    <td className="p-4">每周 {free.searchesPerWeek} 次</td>
                    <td className="p-4">每周 {pro.searchesPerWeek} 次</td>
                    <td className="p-4">每周 {pro.searchesPerWeek} 次</td>
                  </tr>
                  <tr>
                    <td className="p-4 font-medium">每个地点的研究者列表</td>
                    <td className="p-4">前 10 位</td>
                    <td className="p-4">完整名单</td>
                    <td className="p-4">完整名单</td>
                  </tr>
                  <tr>
                    <td className="p-4 font-medium">CSV 导出</td>
                    <td className="p-4">—</td>
                    <td className="p-4">✓</td>
                    <td className="p-4">✓</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="mt-4 text-center text-sm text-gray-600">
              3 个月卡支持微信支付，正好覆盖一个申请季。首次购买 {REFUND_DAYS} 天内无理由退款。价格以结账页为准。
            </p>
            <p className="mt-4 text-center">
              <Link href="/pricing" className={btnSecondary}>查看购买页面</Link>
            </p>
          </section>

          <section className="mb-14">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">常见问题</h2>
            <dl className="space-y-4">
              {FAQS.map(([q, a]) => (
                <div key={q} className="rounded-xl border border-gray-200 bg-white p-5">
                  <dt className="font-semibold text-gray-900 mb-1">{q}</dt>
                  <dd className="text-gray-600">{a}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section className="rounded-2xl bg-blue-600 p-8 text-center text-white">
            <h2 className="text-xl sm:text-2xl font-bold mb-5">申请季时间有限，把找人的时间省下来写套磁信</h2>
            <Link href={REGISTER} className="inline-block rounded-lg bg-white px-6 py-3 font-semibold text-blue-700 hover:bg-blue-50">
              免费开始
            </Link>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
