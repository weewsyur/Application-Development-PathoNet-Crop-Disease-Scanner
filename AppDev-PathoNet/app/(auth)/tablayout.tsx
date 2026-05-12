import React from "react";
import { Tabs } from "expo-router";
import { Home, Scan, BarChart3, Clock, Leaf, Bug } from "lucide-react";
import { StyleSheet, View, Platform } from "react-native";
import { COLORS } from "@/constants/theme";

interface TabConfig {
  name: string;
  title: string;
  icon: React.ReactNode;
  activeIcon: React.ReactNode;
}

const TABS: TabConfig[] = [
  {
    name: "Home",
    title: "Home",
    icon: <Home size={24} />,
    activeIcon: <Home size={24} />,
  },
  {
    name: "Scan",
    title: "Scan",
    icon: <Scan size={24} />,
    activeIcon: <Scan size={24} />,
  },
  {
    name: "Analytics",
    title: "Analytics",
    icon: <BarChart3 size={24} />,
    activeIcon: <BarChart3 size={24} />,
  },
  {
    name: "History",
    title: "History",
    icon: <Clock size={24} />,
    activeIcon: <Clock size={24} />,
  },
];

export const TabLayout: React.FC = () => {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: "#22c55e",
        tabBarInactiveTintColor: "#9ca3af",
        tabBarShowLabel: false,
        tabBarItemStyle: styles.tabItem,
      }}
    >
      {TABS.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.title,
            tabBarIcon: ({ focused, color }) => (
              <View style={styles.iconWrapper}>
                {focused ? tab.activeIcon : tab.icon}
                {focused && <View style={styles.activeDot} />}
              </View>
            ),
          }}
        />
      ))}
    </Tabs>
  );
};

export default TabLayout;

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: COLORS.white,
    borderTopColor: COLORS.border,
    borderTopWidth: 1,
    height: 65, // Unified height for all platforms
    paddingBottom: 8, // Unified padding for all platforms
    paddingTop: 8,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 8,
  },
  tabItem: {
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
  },
  iconWrapper: {
    alignItems: "center",
    justifyContent: "center",
    // Removed gap, paddingHorizontal, paddingVertical, and borderRadius
    // as these can clip icons on Android/mobile
  },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.primary,
    marginTop: 3,
  },
});
