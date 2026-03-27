/**
 * FilterTabs Component - Tab navigation for filtering notes
 * Shows filter labels with counts
 */
export default function FilterTabs({
  tabs = [],
  activeTab = 'all',
  onTabChange,
}) {
  return (
    <div className="flex gap-2 flex-wrap">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 ${
            activeTab === tab.id
              ? 'bg-blue-500 text-white shadow-md'
              : 'bg-gray-100 dark:bg-dark-surface text-gray-700 dark:text-dark-text hover:bg-gray-200 dark:hover:bg-dark-hover'
          }`}
        >
          {tab.label}
          {tab.count !== undefined && (
            <span className="ml-2 text-xs font-semibold opacity-75">
              {tab.count}
            </span>
          )}
        </button>
      ))}
    </div>
  )
}
