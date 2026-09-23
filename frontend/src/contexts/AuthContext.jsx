import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext({});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [personnel, setPersonnel] = useState(null);
  const [loading, setLoading] = useState(false); // Changed to false - no auto-load

  // Demo login function - sets mock user and fetches real personnel data
  const demoLogin = async (selectedUser) => {
    console.log('🎭 Demo login as:', selectedUser.name, selectedUser.role);
    
    setLoading(true); // Show loading while fetching
    
    // Set mock auth user immediately
    setUser({ 
      id: `demo-${selectedUser.role}`, 
      email: selectedUser.email 
    });
    
    // Fetch real personnel data from Supabase - CRITICAL for API calls
    try {
      const { data, error } = await supabase
        .from('personnel')
        .select(`
          id,
          full_name,
          role,
          email,
          station_id,
          specialization,
          is_active,
          stations (
            id,
            name,
            code,
            status
          )
        `)
        .eq('email', selectedUser.email)
        .single();
      
      if (data) {
        console.log('✅ Loaded real personnel from Supabase:', data);
        setPersonnel(data); // Use REAL data with proper UUID
        setLoading(false);
        return; // Success
      }
    } catch (err) {
      console.warn('⚠️ Supabase fetch failed, using fallback UUID:', err);
    }
    
    // Fallback with proper UUIDs from seed data
    const fallbackId = {
      'rajesh.kumar@ncaor.gov.in': 'b0000000-0000-0000-0000-000000000001',
      'anil.sharma@maitri.ant': 'b0000000-0000-0000-0000-000000000002',
      'priya.singh@maitri.ant': 'b0000000-0000-0000-0000-000000000003',
      'vikram.patel@maitri.ant': 'b0000000-0000-0000-0000-000000000004',
      'ramesh.gupta@maitri.ant': 'b0000000-0000-0000-0000-000000000005'
    }[selectedUser.email];
    
    console.log('Using fallback UUID:', fallbackId);
    
    setPersonnel({
      id: fallbackId,
      full_name: selectedUser.name,
      role: selectedUser.role,
      email: selectedUser.email,
      station_id: 'a0000000-0000-0000-0000-000000000001',
      specialization: selectedUser.description,
      is_active: true,
      stations: {
        id: 'a0000000-0000-0000-0000-000000000001',
        name: 'Maitri Station',
        code: 'MAITRI',
        status: 'ACTIVE'
      }
    });
    setLoading(false);
  }; // Empty dependency array - run once only

  const fetchPersonnel = async (userId) => {
    try {
      console.log('Fetching personnel for user_id:', userId);
      const { data, error } = await supabase
        .from('personnel')
        .select('*, stations(*)')
        .eq('user_id', userId)
        .single();

      if (error) {
        console.error('Error fetching personnel:', error);
        throw error;
      }
      
      console.log('Personnel data fetched:', data);
      setPersonnel(data);
    } catch (error) {
      console.error('Error in fetchPersonnel:', error.message);
      alert('Failed to fetch personnel data: ' + error.message + '\n\nMake sure user_id is linked in personnel table!');
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email, password) => {
    console.log('Attempting sign in with:', email);
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (data) {
      console.log('Sign in successful, user:', data.user?.id);
    }
    if (error) {
      console.error('Sign in error:', error.message);
    }
    
    return { data, error };
  };

  const signOut = async () => {
    setUser(null);
    setPersonnel(null);
    return { error: null };
  };

  const value = {
    user,
    personnel,
    loading,
    signIn,
    signOut,
    demoLogin, // Add demo login function
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
