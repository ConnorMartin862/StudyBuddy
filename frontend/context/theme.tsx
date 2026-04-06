import React, { createContext, useContext, useState, useEffect } from 'react';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const lightColors = {
  bg:       '#f5f5f5',
  card:     '#ffffff',
  border:   '#e0e0e0',
  textPri:  '#212121',
  textSec:  '#757575',
  input:    '#ffffff',
  inputTxt: '#212121',
};

const darkColors = {
  bg:       '#121212',
  card:     '#1e1e1e',
  border:   '#2a2a2a',
  textPri:  '#ffffff',
  textSec:  '#aaaaaa',
  input:    '#2a2a2a',
  inputTxt: '#ffffff',
};

type Theme = typeof lightColors;

const ThemeContext = createContext<{
  dark: boolean;
  colors: Theme;
  toggleDark: () => void;
}>({
  dark: false,
  colors: lightColors,
  toggleDark: () => {},
});

async function saveItem(key: string, value: string) {
  if (Platform.OS === 'web') localStorage.setItem(key, value);
  else await SecureStore.setItemAsync(key, value);
}

async function getItem(key: string): Promise<string | null> {
  if (Platform.OS === 'web') return localStorage.getItem(key);
  return await SecureStore.getItemAsync(key);
}

export function AppThemeProvider({ children }: { children: React.ReactNode }) {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    getItem('darkMode').then((val) => {
      if (val === 'true') setDark(true);
    });
  }, []);

  const toggleDark = async () => {
    const next = !dark;
    setDark(next);
    await saveItem('darkMode', String(next));
  };

  return (
    <ThemeContext.Provider value={{ dark, colors: dark ? darkColors : lightColors, toggleDark }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}