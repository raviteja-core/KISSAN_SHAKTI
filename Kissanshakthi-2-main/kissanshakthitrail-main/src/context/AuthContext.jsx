import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

const defaultUsers = [
  {
    name: 'Vikas Patil',
    phone: '9855667788',
    password: 'password123',
    role: 'farmer',
    region: 'Maharashtra',
    isVerified: true,
    verificationStep: 'completed',
    isBlacklisted: false
  },
  {
    name: 'Suresh Pawar',
    phone: '9988776655',
    password: 'password123',
    role: 'laborer',
    region: 'Maharashtra',
    daily_rate: 450,
    skills: ['Harvesting', 'Sowing'],
    isVerified: true,
    verificationStep: 'completed',
    isBlacklisted: false
  },
  {
    name: 'Anjali Sharma',
    phone: '9876543210',
    email: 'anjali@buyer.com',
    password: 'buyer123',
    role: 'buyer',
    region: 'Maharashtra',
    isVerified: true,
    verificationStep: 'completed',
    isBlacklisted: false
  },
  {
    name: 'System Administrator',
    phone: '9999999999',
    email: 'admin@kissan.com',
    password: 'adminpassword',
    role: 'admin',
    isVerified: true,
    verificationStep: 'completed',
    isBlacklisted: false
  }
];

const cleanPhone = (p) => {
  if (!p) return '';
  return p.replace(/\D/g, '').slice(-10);
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const cached = localStorage.getItem('kissan_auth_user');
    return cached ? JSON.parse(cached) : null;
  });

  useEffect(() => {
    const existingUsersJson = localStorage.getItem('kissan_registered_users');
    if (!existingUsersJson) {
      localStorage.setItem('kissan_registered_users', JSON.stringify(defaultUsers));
    } else {
      const existingUsers = JSON.parse(existingUsersJson);
      let updated = false;
      defaultUsers.forEach(defaultUser => {
        const exists = existingUsers.some(u => u.phone === defaultUser.phone && u.role === defaultUser.role);
        if (!exists) {
          existingUsers.push(defaultUser);
          updated = true;
        }
      });
      if (updated) {
        localStorage.setItem('kissan_registered_users', JSON.stringify(existingUsers));
      }
    }
  }, []);

  const login = (role, identifier, password) => {
    const usersJson = localStorage.getItem('kissan_registered_users');
    const users = usersJson ? JSON.parse(usersJson) : defaultUsers;

    const cleanedIdentifier = cleanPhone(identifier);

    const foundUser = users.find(u => {
      if (u.role !== role) return false;
      if (u.password !== password) return false;

      if (role === 'admin') {
        const uEmail = u.email ? u.email.toLowerCase() : '';
        const idLower = identifier ? identifier.toLowerCase() : '';
        return uEmail === idLower || cleanPhone(u.phone) === cleanedIdentifier;
      }

      return cleanPhone(u.phone) === cleanedIdentifier;
    });

    if (foundUser) {
      const { password: _, ...userSession } = foundUser;
      setUser(userSession);
      localStorage.setItem('kissan_auth_user', JSON.stringify(userSession));
      return { success: true };
    }

    return { 
      success: false, 
      error: `Invalid credentials. Please make sure the ${role === 'admin' ? 'email/phone' : 'phone number'} and password are correct for the selected ${role} portal.` 
    };
  };

  const register = (registrationData) => {
    const usersJson = localStorage.getItem('kissan_registered_users');
    const users = usersJson ? JSON.parse(usersJson) : [...defaultUsers];

    const cleanedPhone = cleanPhone(registrationData.phone);
    const alreadyExists = users.some(u => {
      if (cleanPhone(u.phone) === cleanedPhone) return true;
      if (registrationData.email && u.email && u.email.toLowerCase() === registrationData.email.toLowerCase()) return true;
      return false;
    });

    if (alreadyExists) {
      return { success: false, error: 'User with this phone/email is already registered.' };
    }

    const newUser = {
      name: registrationData.name,
      phone: registrationData.phone,
      password: registrationData.password,
      role: registrationData.role,
      region: registrationData.region || 'Maharashtra',
      isVerified: registrationData.role === 'admin',
      verificationStep: registrationData.role === 'admin' ? 'completed' : 'onboarding',
      isBlacklisted: false,
      daily_rate: registrationData.daily_rate ? Number(registrationData.daily_rate) : undefined,
      skills: registrationData.skills || undefined,
      email: registrationData.email || undefined
    };

    users.push(newUser);
    localStorage.setItem('kissan_registered_users', JSON.stringify(users));

    const { password: _, ...userSession } = newUser;
    setUser(userSession);
    localStorage.setItem('kissan_auth_user', JSON.stringify(userSession));

    return { success: true };
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('kissan_auth_user');
  };

  const updateVerification = (updates) => {
    setUser(prev => {
      if (!prev) return null;
      const nextUser = { ...prev, ...updates };
      localStorage.setItem('kissan_auth_user', JSON.stringify(nextUser));
      
      const usersJson = localStorage.getItem('kissan_registered_users');
      if (usersJson) {
        const users = JSON.parse(usersJson);
        const updatedUsers = users.map(u => {
          if (cleanPhone(u.phone) === cleanPhone(prev.phone)) {
            return { ...u, ...updates };
          }
          return u;
        });
        localStorage.setItem('kissan_registered_users', JSON.stringify(updatedUsers));
      }
      
      return nextUser;
    });
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, updateVerification }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
