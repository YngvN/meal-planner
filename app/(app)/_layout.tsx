import { Redirect } from 'expo-router'
import { Drawer } from 'expo-router/drawer'
import { Platform, View, Text, Pressable } from 'react-native'
import {
  BookOpen,
  CalendarDays,
  Carrot,
  House,
  LogOut,
  Package,
  Settings,
  ShieldCheck,
  ShoppingCart,
  type LucideIcon,
} from 'lucide-react-native'
import { useAppDispatch, useAppSelector } from '../../src/store/hooks'
import { logoutUser } from '../../src/features/auth/authSlice'
import { useLanguage } from '../../src/i18n'
import { useRouter } from 'expo-router'

/** A single navigation entry in the app drawer. */
interface NavItem {
  /** Expo Router screen name (file-path within this group, used for Drawer.Screen). */
  name: string
  /** URL path to navigate to when the item is pressed. */
  href: string
  labelId: string
  Icon: LucideIcon
}

const NAV_ITEMS: NavItem[] = [
  { name: 'index',           href: '/',              labelId: 'nav.home',         Icon: House },
  { name: 'recipes/index',   href: '/recipes',       labelId: 'nav.recipes',      Icon: BookOpen },
  { name: 'ingredients',     href: '/ingredients',   labelId: 'nav.ingredients',  Icon: Carrot },
  { name: 'pantry',          href: '/pantry',        labelId: 'nav.pantry',       Icon: Package },
  { name: 'meal-plan',       href: '/meal-plan',     labelId: 'nav.mealPlan',     Icon: CalendarDays },
  { name: 'shopping-list',   href: '/shopping-list', labelId: 'nav.shoppingList', Icon: ShoppingCart },
  { name: 'settings',        href: '/settings',      labelId: 'nav.settings',     Icon: Settings },
]

/**
 * Protected app shell. Redirects to /login if the user is not authenticated.
 * On native: renders a Drawer navigator (left-swipe + hamburger).
 * On web: the Drawer renders as a persistent sidebar.
 */
export default function AppLayout() {
  const { user, initialized } = useAppSelector((s) => s.auth)
  const dispatch = useAppDispatch()
  const router = useRouter()
  const { t } = useLanguage()

  // Render nothing until auth state is restored from storage.
  if (!initialized) return null

  if (!user) return <Redirect href="/login" />

  async function handleSignOut() {
    await dispatch(logoutUser())
    router.replace('/login')
  }

  return (
    <Drawer
      drawerContent={() => (
        <View className="flex-1 bg-surface dark:bg-surface-dark pt-12 pb-6 px-4">
          <Text className="text-xl font-extrabold text-app-text dark:text-text-dark mb-6">
            {t('nav.appName')}
          </Text>

          <View className="flex-1 gap-1">
            {NAV_ITEMS.map(({ name, href, labelId, Icon }) => (
              <Pressable
                key={name}
                onPress={() => router.push(href as never)}
                className="flex-row items-center gap-3 px-3 py-3 rounded-lg active:shadow-inner"
              >
                <Icon size={20} className="text-app-text dark:text-text-dark" />
                <Text className="text-app-text dark:text-text-dark font-medium">
                  {t(labelId)}
                </Text>
              </Pressable>
            ))}

            {user.role === 'admin' && (
              <Pressable
                onPress={() => router.push('/admin')}
                className="flex-row items-center gap-3 px-3 py-3 rounded-lg active:shadow-inner"
              >
                <ShieldCheck size={20} className="text-app-text dark:text-text-dark" />
                <Text className="text-app-text dark:text-text-dark font-medium">
                  {t('nav.admin')}
                </Text>
              </Pressable>
            )}
          </View>

          <View className="border-t border-border dark:border-border-dark pt-3 gap-1">
            {user && (
              <Text className="text-sm text-text-muted dark:text-text-muted-dark px-3 mb-1" numberOfLines={1}>
                {user.username}
              </Text>
            )}
            <Pressable
              onPress={handleSignOut}
              className="flex-row items-center gap-3 px-3 py-3 rounded-lg active:shadow-inner"
            >
              <LogOut size={18} className="text-app-text dark:text-text-dark" />
              <Text className="text-app-text dark:text-text-dark font-medium">
                {t('auth.signOut')}
              </Text>
            </Pressable>
          </View>
        </View>
      )}
      screenOptions={{
        headerStyle: {
          backgroundColor: Platform.OS === 'web' ? undefined : '#ffffff',
        },
        drawerStyle: {
          width: 220,
        },
        // On web, keep the drawer always open as a sidebar.
        drawerType: Platform.OS === 'web' ? 'permanent' : 'front',
      }}
    >
      <Drawer.Screen name="index" options={{ title: t('nav.home') }} />
      <Drawer.Screen name="recipes/index" options={{ title: t('nav.recipes') }} />
      <Drawer.Screen name="ingredients" options={{ title: t('nav.ingredients') }} />
      <Drawer.Screen name="pantry" options={{ title: t('nav.pantry') }} />
      <Drawer.Screen name="meal-plan" options={{ title: t('nav.mealPlan') }} />
      <Drawer.Screen name="shopping-list" options={{ title: t('nav.shoppingList') }} />
      <Drawer.Screen name="settings" options={{ title: t('nav.settings') }} />
      <Drawer.Screen name="admin" options={{ title: t('nav.admin') }} />
      <Drawer.Screen name="profile" options={{ title: 'Profile' }} />
      <Drawer.Screen name="recipes/[id]/index" options={{ headerShown: false }} />
      <Drawer.Screen name="recipes/[id]/edit" options={{ headerShown: false }} />
    </Drawer>
  )
}
