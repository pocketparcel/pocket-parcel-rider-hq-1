function Layout({ header, sidebar, children }) {
  return (
    <div className="h-screen overflow-hidden bg-[#f5f6fa] text-slate-800">
      <div className="flex h-full">
        {sidebar}
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          {header}
          <main className="flex min-h-0 flex-1 flex-col overflow-x-hidden overflow-y-auto p-4">
            <div className="flex min-h-0 min-w-0 flex-1 flex-col">{children}</div>
          </main>
        </div>
      </div>
    </div>
  )
}

export default Layout
