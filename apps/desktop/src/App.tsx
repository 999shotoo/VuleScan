import React, { useEffect, useState } from 'react';
import { Routes, Route, HashRouter, Outlet, useLocation } from 'react-router-dom';
import Home from '@/src/pages/home';
import { TooltipProvider } from './components/ui/tooltip';

import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "./components/ui/sidebar"
import { AppSidebar } from './components/sidebar-2';
import { ChatHome } from './pages/chat/home';
import { MainChat } from './pages/chat/mainchat';
import SubdomainFinderPage from './pages/tools/subdomain-finder';

const SectionPlaceholder = ({
  title,
  description,
}: {
  title: string;
  description: string;
}) => (
  <div className="flex h-full items-center justify-center px-6">
    <div className="max-w-md text-center">
      <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
    </div>
  </div>
)

const Layout = () => {
  const location = useLocation()
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  const isChatHomeRoute = location.pathname === '/chat'
  const isChatSessionRoute = /^\/chat\/[^/]+$/.test(location.pathname)
  const shouldShowSecondarySidebar =
    isChatHomeRoute ||
    isChatSessionRoute ||
    location.pathname === '/drafts' ||
    location.pathname === '/sent' ||
    location.pathname === '/junk' ||
    location.pathname === '/trash'

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <div className="h-screen flex flex-col">
      {/* <Header /> */}

      {!isOnline ? (
        <div className="flex-1 flex items-center justify-center bg-red-600 text-white text-center flex-col p-4">
          <h1 className="text-3xl font-bold mb-2">You're Offline</h1>
          <p className="text-lg">Please check your internet connection.</p>
        </div>
      ) : (
        <>

          {/* <nav className="pt-10 px-4">
            <Link to="/" className="mr-4 text-blue-600 hover:underline">Home</Link>
            <Link to="/dashboard" className="text-blue-600 hover:underline">Dashboard</Link>
            <Link to="/login" className="ml-4 text-blue-600 hover:underline">Login</Link>
            <Link to="/register" className="ml-4 text-blue-600 hover:underline">Register</Link>
          </nav> */}
          {/* <Sidebar>
          <main>
            <Outlet />
          </main>
          </Sidebar> */}
          <SidebarProvider
            style={
              {
                "--sidebar-width": "350px",
              } as React.CSSProperties
            }
            className="flex-1"
          >
            <AppSidebar />
            <SidebarInset className="flex flex-col ">
              <header className="bg-background sticky top-0 flex shrink-0 items-center gap-2 border-b p-4 h-14 z-10 drag ">
                {shouldShowSecondarySidebar && (
                  <SidebarTrigger className="-ml-1 no-drag" />
                )}
              
              </header>
              <div className="flex-1 overflow-hidden">
                <Outlet />
              </div>
            </SidebarInset>
          </SidebarProvider>
          {/* <Outlet /> */}
        </>
      )}
    </div>
  );
};



function App(): React.JSX.Element {
  return (
    // <AuthProvider>
    //   <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
    <TooltipProvider>
      <HashRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="/chat" element={<ChatHome />} />
            <Route path="/chat/:id" element={<MainChat />} />
            <Route path="/tools/subdomain-finder" element={<SubdomainFinderPage />} />
            <Route path="/tools/subbdomain-finder" element={<SubdomainFinderPage />} />
              <Route
                path="/drafts"
                element={
                  <SectionPlaceholder
                    title="Drafts"
                    description="Saved draft scan configurations and reports will appear here."
                  />
                }
              />
              <Route
                path="/sent"
                element={
                  <SectionPlaceholder
                    title="Sent"
                    description="Completed reports and previously shared results live here."
                  />
                }
              />
              <Route
                path="/junk"
                element={
                  <SectionPlaceholder
                    title="Junk"
                    description="Suspicious or discarded items can be reviewed here if needed."
                  />
                }
              />
              <Route
                path="/trash"
                element={
                  <SectionPlaceholder
                    title="Trash"
                    description="Recently removed items are kept here until they are cleared permanently."
                  />
                }
              />
            <Route path="*" element={<div>404 Not Found</div>} />
            
          </Route>
        </Routes>
      </HashRouter>
    </TooltipProvider>
    //   </ThemeProvider>
    // </AuthProvider>
  );
}

export default App;
