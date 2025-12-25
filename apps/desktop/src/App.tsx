import React, { useEffect, useState } from 'react';
import { Routes, Route, HashRouter, Outlet, Link } from 'react-router-dom';
import Home from '@/src/pages/home';
import Sidebar from './components/sidebar';




const Layout = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

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
    <div className="min-h-screen flex flex-col">
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
          <Sidebar>
          <main>
            <Outlet />
          </main>
          </Sidebar>
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
        <HashRouter>
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<Home />} />
            </Route>
          </Routes>
        </HashRouter>
    //   </ThemeProvider>
    // </AuthProvider>
  );
}

export default App;
