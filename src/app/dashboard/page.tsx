import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { 
  BarChart3, 
  Coins, 
  Megaphone, 
  ShoppingBag, 
  Users,
  CheckCircle2,
  Clock,
  ArrowRight,
  Plus,
  Gamepad2,
  ClipboardList,
  Video,
  Send,
  Zap,
  ChevronRight,
  Wallet,
  Trophy,
  Star
} from 'lucide-react'
import Link from 'next/link'
import ArcadeModeCard from '@/components/ArcadeModeCard'

export default async function InfluencerDashboardPage() {
  const supabase = createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  // Fetch Visible Campaigns (matching mobile RPC)
  const { data: campaigns } = await supabase
    .rpc('get_visible_status_posts', { p_user_id: user.id })

  // Fetch Wallet Stats
  const { data: completedSurveys } = await supabase
    .from('survey_responses')
    .select('id')
    .eq('user_id', user.id)

  const { data: completedChallenges } = await supabase
    .from('challenge_submissions')
    .select('id')
    .eq('user_id', user.id)

  const { data: joinedHubs } = await supabase
    .from('hub_members')
    .select('hub_id')
    .eq('profile_id', user.id)

  const totalParticipations = (completedSurveys?.length || 0) + (completedChallenges?.length || 0)
  const hubsCount = joinedHubs?.length || 0

  return (
    <>
      {/* Header */}
      <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-8 sticky top-0 z-10">
        <h1 className="text-lg font-semibold text-gray-800">Influencer Overview</h1>
        
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 bg-brand/10 px-3 py-1.5 rounded-full border border-brand/10">
            <Coins className="text-brand" size={18} />
            <span className="text-brand font-bold text-sm">
              {profile?.brandible_coins?.toLocaleString() || '0'} BC
            </span>
          </div>
          <div className="h-8 w-8 rounded-full bg-gray-100 border border-gray-200 overflow-hidden">
             {profile?.avatar_url ? (
               <img src={profile.avatar_url} alt="Profile" className="h-full w-full object-cover" />
             ) : (
               <div className="h-full w-full flex items-center justify-center text-xs text-gray-400 font-bold">
                 {profile?.username?.charAt(0).toUpperCase() || 'I'}
               </div>
             )}
          </div>
        </div>
      </header>

      {/* Dashboard Content */}
      <div className="p-8 max-w-7xl mx-auto space-y-12">
        {/* Welcome Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-black text-gray-900 tracking-tight">Hello, {profile?.full_name || profile?.username}!</h2>
            <p className="text-gray-500 font-medium mt-1">Ready to explore new campaigns and earn rewards?</p>
          </div>
          
          <Link 
            href="/dashboard/wallet"
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand text-white shadow-lg shadow-brand/20 hover:opacity-90 transition-all"
          >
            <Wallet size={18} />
            <span className="text-sm font-bold">Withdraw Earnings</span>
          </Link>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard 
            label="Total Earned" 
            value={`${profile?.brandible_coins?.toLocaleString() || 0}`} 
            unit="BC"
            change="Available now"
            icon={<Coins className="text-brand" />}
          />
          <StatCard 
            label="Participations" 
            value={totalParticipations} 
            unit=""
            change="Lifetime entries"
            icon={<Trophy className="text-orange-500" />}
          />
          <StatCard 
            label="Available Tasks" 
            value={campaigns?.length || 0} 
            unit=""
            change="Active opportunities"
            icon={<Megaphone className="text-blue-500" />}
          />
          <StatCard 
            label="Hubs Joined" 
            value={hubsCount} 
            unit=""
            change="View directory"
            icon={<Users className="text-purple-500" />}
          />
        </div>

        {/* Main Sections Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Active Opportunities */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black text-gray-900 uppercase tracking-widest">Recommended for You</h3>
              <Link href="/dashboard/campaigns" className="text-xs font-bold text-brand hover:underline flex items-center gap-1">
                Browse All <ArrowRight size={14} />
              </Link>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {campaigns && campaigns.length > 0 ? campaigns.slice(0, 4).map((camp: any) => (
                <div key={camp.id} className="bg-white rounded-[2rem] p-6 border border-gray-100 shadow-sm hover:shadow-md transition-all group">
                   <div className="flex items-start justify-between mb-4">
                      <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${camp.type === 'challenge' ? 'bg-purple-50 text-purple-600' : 'bg-blue-50 text-blue-600'}`}>
                         {camp.type === 'challenge' ? <Video size={20} /> : <Zap size={20} />}
                      </div>
                      <div className="bg-emerald-50 text-emerald-600 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
                         Earn {camp.reward_amount} BC
                      </div>
                   </div>
                   <h4 className="font-bold text-gray-900 line-clamp-1 mb-1">{camp.title}</h4>
                   <p className="text-xs text-gray-500 line-clamp-2 mb-6 h-8">{camp.description}</p>
                   <button className="w-full py-3 bg-gray-50 text-gray-900 rounded-xl text-xs font-black uppercase tracking-widest group-hover:bg-brand group-hover:text-white transition-all">
                      Start Task
                   </button>
                </div>
              )) : (
                <div className="col-span-full py-20 bg-white rounded-[2rem] border border-dashed border-gray-100 flex flex-col items-center justify-center text-gray-400">
                   <Megaphone size={40} className="opacity-20 mb-4" />
                   <p className="text-sm font-bold uppercase tracking-widest">No active campaigns</p>
                </div>
              )}
            </div>
          </div>
          
          {/* Quick Tasks & Community */}
          <div className="space-y-8">
            <ArcadeModeCard user={user} />

            <div className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-sm">
               <h3 className="text-lg font-black text-gray-900 uppercase tracking-widest mb-6">Top Communities</h3>
               <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-4 p-4 hover:bg-gray-50 rounded-2xl transition-all cursor-pointer border border-transparent hover:border-gray-100">
                       <div className="h-10 w-10 rounded-xl bg-gray-100 flex items-center justify-center font-bold text-gray-400 text-sm">
                          H
                       </div>
                       <div className="flex-1">
                          <p className="text-sm font-bold text-gray-900">Tech Explorers</p>
                          <p className="text-[10px] text-gray-400 font-black uppercase tracking-wider">2.4k Members</p>
                       </div>
                       <ChevronRight size={16} className="text-gray-300" />
                    </div>
                  ))}
               </div>
               <Link href="/dashboard/hubs" className="block mt-6 w-full py-3 bg-gray-50 text-gray-400 text-center rounded-xl text-[10px] font-black uppercase tracking-widest hover:text-brand transition-colors">
                  View All Hubs
               </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

function StatCard({ label, value, unit, change, icon }: any) {
  return (
    <div className="bg-white rounded-[2rem] p-8 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-6">
        <div className="p-3 bg-gray-50 rounded-2xl">
          {icon}
        </div>
      </div>
      <div>
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{label}</p>
        <div className="flex items-baseline gap-1 mt-2">
           <h4 className="text-3xl font-black text-gray-900">{value}</h4>
           <span className="text-xs font-bold text-gray-400 uppercase">{unit}</span>
        </div>
        <div className="flex items-center gap-1.5 mt-2">
           <div className="h-1.5 w-1.5 rounded-full bg-emerald-500"></div>
           <p className="text-xs text-emerald-600 font-bold">{change}</p>
        </div>
      </div>
    </div>
  )
}
