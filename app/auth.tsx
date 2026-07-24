import { Redirect } from 'expo-router'

// Expo Router maps evats://auth to this route after the OAuth browser closes.
// The session is persisted by signInWithGoogle; return to the app entry route.
export default function AuthCallbackScreen() {
  return <Redirect href="/" />
}
