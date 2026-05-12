import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { COLORS, SIZES } from "@/constants/theme";

const AppHeader = React.memo(function AppHeader({ title = "PATHONET" }: { title?: string }) {
  return (
    <View style={styles.header}>
      <Text style={styles.title}>{title}</Text>
    </View>
  );
});

export default AppHeader;

const styles = StyleSheet.create({
  header: {
    backgroundColor: COLORS.headerBg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingTop: 48,
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    color: COLORS.white,
    letterSpacing: 1.5,
  },
});
