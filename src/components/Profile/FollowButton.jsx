import { Loader2, UserCheck, UserPlus } from 'lucide-react'

/**
 * @param {{ loading: boolean, isFollowing: boolean, onToggle: ()=>Promise<void> }} props
 */
export default function FollowButton({ loading, isFollowing, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={loading}
      className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-sage text-white hover:bg-sage-light disabled:opacity-60 disabled:cursor-not-allowed text-sm"
    >
      {loading ? <Loader2 size={14} className="animate-spin" /> : isFollowing ? <UserCheck size={14} /> : <UserPlus size={14} />}
      {isFollowing ? 'Following' : 'Follow'}
    </button>
  )
}
