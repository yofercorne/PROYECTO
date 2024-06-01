import React, { createContext, useContext, useEffect, useState } from 'react';
import { getAuth, onAuthStateChanged, signOut } from 'firebase/auth';
import appfirebase from './credenciales';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const auth = getAuth(appfirebase);

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        await firebaseUser.reload();
        console.log('Firebase user state changed:', firebaseUser); // Debug message
        if (firebaseUser.emailVerified) {
          console.log('User is authenticated and email is verified:', firebaseUser); // Debug message
          setUser(firebaseUser);
          setIsAuthenticated(true);
          localStorage.setItem('user', JSON.stringify(firebaseUser));
          localStorage.setItem('isAuthenticated', 'true');
        } else {
          console.log('User email is not verified'); // Debug message
          setUser(null);
          setIsAuthenticated(false);
          localStorage.removeItem('user');
          localStorage.removeItem('isAuthenticated');
        }
      } else {
        console.log('No user is authenticated'); // Debug message
        setUser(null);
        setIsAuthenticated(false);
        localStorage.removeItem('user');
        localStorage.removeItem('isAuthenticated');
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    try {
      const storedUser = localStorage.getItem('user');
      const storedIsAuthenticated = localStorage.getItem('isAuthenticated');
      console.log('Stored user from localStorage:', storedUser); // Debug message
      console.log('Stored isAuthenticated from localStorage:', storedIsAuthenticated); // Debug message

      if (storedUser && storedIsAuthenticated === 'true') {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
        setIsAuthenticated(true);
      }
    } catch (error) {
      console.error("Failed to parse user from localStorage", error);
      localStorage.removeItem('user');
      localStorage.removeItem('isAuthenticated');
    }
  }, []);

  const login = (user) => {
    console.log('Logging in user:', user); // Debug message
    if (user.emailVerified) {
      setUser(user);
      setIsAuthenticated(true);
      localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem('isAuthenticated', 'true');
    } else {
      console.error("User email is not verified, cannot log in");
    }
  };

  const logout = async () => {
    const auth = getAuth(appfirebase);
    await signOut(auth);
    console.log('User logged out'); // Debug message
    setUser(null);
    setIsAuthenticated(false);
    localStorage.removeItem('user');
    localStorage.removeItem('isAuthenticated');
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
