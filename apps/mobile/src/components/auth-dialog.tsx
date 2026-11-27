// RN port of apps/web/src/components/auth-dialog.tsx. Same three states
// (register / sign in / verify code) and the same Google entry point, which on
// native opens a system auth session instead of navigating the page. iOS adds
// Sign in with Apple, drawn with Apple's own button as its guidelines require.
import { useState } from 'react'
import { Pressable, Text, View, useColorScheme } from 'react-native'
import * as AppleAuthentication from 'expo-apple-authentication'
import {
  Button,
  Dialog,
  GoogleIcon,
  PasswordField,
  TextField,
} from '@/components/ui'
import { useI18n } from '@/lib/i18n/messages-provider'
import {
  useRegister,
  useResendCode,
  useSignIn,
  useVerifyEmail,
} from '@/lib/api/use-auth'
import { useAppleSignIn } from '@/lib/auth/use-apple-auth'
import { useGoogleSignIn } from '@/lib/auth/use-google-auth'

type Mode = 'register' | 'signin'

function errorText(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback
}

export function AuthDialog({
  open,
  onClose,
  initialMode = 'register',
}: {
  open: boolean
  onClose: () => void
  initialMode?: Mode
}) {
  const { messages } = useI18n()
  const [mode, setMode] = useState<Mode>(initialMode)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [code, setCode] = useState('')

  const register = useRegister()
  const signIn = useSignIn()
  const verify = useVerifyEmail()
  const resend = useResendCode()
  const google = useGoogleSignIn()
  const apple = useAppleSignIn()
  const scheme = useColorScheme()

  function close() {
    setVerifying(false)
    setPassword('')
    setCode('')
    onClose()
  }

  function submit() {
    if (mode === 'register') {
      register.mutate(
        { email: email.trim(), password },
        { onSuccess: () => setVerifying(true) },
      )
    } else {
      signIn.mutate({ email: email.trim(), password }, { onSuccess: close })
    }
  }

  function submitCode() {
    verify.mutate({ code: code.trim() }, { onSuccess: close })
  }

  const title = verifying
    ? messages.auth.verifyTitle
    : mode === 'register'
      ? messages.auth.createAccount
      : messages.auth.signIn

  return (
    <Dialog open={open} onClose={close} title={title}>
      {verifying ? (
        <View className="gap-3">
          <Text className="text-ink-500 text-sm">
            {messages.auth.verifySubtitle}
          </Text>
          <TextField
            value={code}
            onChangeText={setCode}
            label={messages.auth.code}
            keyboardType="number-pad"
            maxLength={6}
            placeholder="123456"
            autoFocus
          />
          {verify.isError ? (
            <Text className="text-danger text-sm">
              {errorText(verify.error, messages.common.error)}
            </Text>
          ) : null}
          <Button
            onPress={submitCode}
            isLoading={verify.isPending}
            disabled={code.trim().length !== 6}
          >
            {messages.auth.verify}
          </Button>
          <Button
            variant="ghost"
            onPress={() => resend.mutate()}
            isLoading={resend.isPending}
          >
            {resend.isSuccess ? messages.auth.resent : messages.auth.resend}
          </Button>
        </View>
      ) : (
        <View className="gap-3">
          <Text className="text-ink-500 text-sm">
            {mode === 'register'
              ? messages.auth.createAccountSubtitle
              : messages.auth.signInSubtitle}
          </Text>
          <TextField
            value={email}
            onChangeText={setEmail}
            label={messages.auth.email}
            placeholder="you@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            autoFocus
          />
          <PasswordField
            value={password}
            onChangeText={setPassword}
            label={messages.auth.password}
            showLabel={messages.auth.showPassword}
            hideLabel={messages.auth.hidePassword}
            autoCapitalize="none"
            autoComplete={
              mode === 'register' ? 'new-password' : 'current-password'
            }
          />
          {register.isError || signIn.isError ? (
            <Text className="text-danger text-sm">
              {errorText(register.error ?? signIn.error, messages.common.error)}
            </Text>
          ) : null}
          <Button
            onPress={submit}
            isLoading={register.isPending || signIn.isPending}
            disabled={!email.trim() || !password}
          >
            {mode === 'register'
              ? messages.auth.register
              : messages.auth.signIn}
          </Button>
          {apple.isAvailable ? (
            <AppleAuthentication.AppleAuthenticationButton
              buttonType={
                AppleAuthentication.AppleAuthenticationButtonType.CONTINUE
              }
              buttonStyle={
                scheme === 'dark'
                  ? AppleAuthentication.AppleAuthenticationButtonStyle.WHITE
                  : AppleAuthentication.AppleAuthenticationButtonStyle.BLACK
              }
              cornerRadius={12}
              style={{ height: 44 }}
              onPress={() =>
                void apple.start().then(signedIn => signedIn && close())
              }
            />
          ) : null}
          {apple.isError ? (
            <Text className="text-danger text-sm">{messages.common.error}</Text>
          ) : null}
          <Button
            variant="ghost"
            onPress={() => void google.start()}
            isLoading={google.isPending}
            className="border-line bg-surface active:bg-bg gap-3 border"
          >
            <GoogleIcon />
            <Text className="text-ink-700 text-sm font-medium">
              {messages.auth.continueWithGoogle}
            </Text>
          </Button>
          {google.isError ? (
            <Text className="text-danger text-sm">{messages.common.error}</Text>
          ) : null}
          <Pressable
            accessibilityRole="button"
            onPress={() => setMode(mode === 'register' ? 'signin' : 'register')}
          >
            <Text className="text-brand-accent text-sm font-medium">
              {mode === 'register'
                ? messages.auth.haveAccount
                : messages.auth.noAccount}
            </Text>
          </Pressable>
        </View>
      )}
    </Dialog>
  )
}
