import "react-native";
declare module "react-native" {
  interface ViewProps { className?: string; variant?: string; tone?: string }
  interface TextProps { className?: string; tone?: string }
  interface PressableProps { className?: string }
}
