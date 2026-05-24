import { Tabs } from "expo-router";
import { Text } from "react-native";

function TabIcon({ label, focused }: { label: string; focused: boolean }) {
  return (
    <Text
      style={{
        fontSize: 11,
        fontWeight: focused ? "600" : "400",
        color: focused ? "#0284c7" : "#64748b",
      }}
    >
      {label}
    </Text>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Combo",
          tabBarIcon: ({ focused }) => (
            <TabIcon label="Combo" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="smhi"
        options={{
          title: "SMHI",
          tabBarIcon: ({ focused }) => (
            <TabIcon label="SMHI" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="met"
        options={{
          title: "MET Norway",
          tabBarIcon: ({ focused }) => (
            <TabIcon label="MET" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="dmi"
        options={{
          title: "DMI",
          tabBarIcon: ({ focused }) => (
            <TabIcon label="DMI" focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}
