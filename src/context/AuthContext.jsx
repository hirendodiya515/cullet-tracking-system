import { createContext, useContext, useEffect, useState } from 'react';
import { auth, db } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userRole, setUserRole] = useState(null); // 'Admin', 'Engineer', 'Operator'
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Fetch user document to get the role
        try {
          const userDocRef = doc(db, 'users', user.uid);
          const userDoc = await getDoc(userDocRef);
          if (userDoc.exists()) {
            setUserRole(userDoc.data().role);
          } else {
            console.warn('User document not found in Firestore. Creating default Administrator document for MVP access.');
            // For MVP, if they create an account and no document exists, make them Admin 
            // so they can access the Dashboard. In production, this would be 'Operator' or require manual admin approval.
            const { setDoc } = await import('firebase/firestore');
            try {
              await setDoc(userDocRef, {
                email: user.email,
                role: 'Admin',
                createdAt: new Date()
              });
              setUserRole('Admin');
              console.log("Created user document successfully");
            } catch (err) {
              console.error("Failed to create default user doc (check Firestore rules):", err);
              setUserRole('Operator');
            }
          }
        } catch (error) {
          console.error("Error fetching user role:", error);
          setUserRole('Operator'); // Fallback
        }
      } else {
        setUserRole(null);
      }
      
      setCurrentUser(user);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    userRole,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
