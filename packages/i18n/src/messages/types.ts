export type LegalBlock =
  | { kind: 'p'; text: string }
  | { kind: 'list'; items: string[] }

export type LegalSectionContent = {
  title: string
  blocks: LegalBlock[]
}

export type LegalDocument = {
  title: string
  intro: string
  sections: LegalSectionContent[]
}

export type Messages = {
  app: {
    name: string
    tagline: string
  }
  footer: {
    description: string
    rights: string
    terms: string
    privacy: string
  }
  legal: {
    backToApp: string
    updatedAt: string
    terms: LegalDocument
    privacy: LegalDocument
  }
  onboarding: {
    title: string
    subtitle: string
    namePlaceholder: string
    start: string
  }
  common: {
    loading: string
    error: string
    retry: string
  }
  recurring: {
    manage: string
    title: string
    subtitle: string
    add: string
    empty: string
    titlePlaceholder: string
    frequency: string
    daily: string
    weekly: string
    monthly: string
    interval: string
    weekdays: string
    monthday: string
    startDate: string
    until: string
    save: string
    cancel: string
    edit: string
    delete: string
    back: string
  }
  nav: {
    today: string
    lists: string
    analytics: string
    generate: string
    developers: string
    profile: string
    menu: string
  }
  notifications: {
    title: string
    empty: string
    markAllRead: string
    assigned: string
    open: string
  }
  carryOver: {
    pendingTitle: string
    bring: string
    broughtFrom: string
    settingLabel: string
    settingHint: string
    modeManual: string
    modeAuto: string
  }
  timezone: {
    settingLabel: string
    settingHint: string
    useDetected: string
  }
  developers: {
    title: string
    subtitle: string
    name: string
    namePlaceholder: string
    scopes: string
    expiry: string
    noExpiry: string
    generate: string
    empty: string
    createdTitle: string
    createdHint: string
    copy: string
    copied: string
    done: string
    revoke: string
    revokedBadge: string
    expiredBadge: string
    lastUsed: string
    neverUsed: string
    docsLink: string
  }
  task: {
    add: string
    empty: string
    completed: string
    pending: string
    allDone: string
    progress: string
    reorder: string
    assignee: string
    togglePrivacy: string
    private: string
    visible: string
    recurring: string
    addNote: string
    editNote: string
    note: string
    notePlaceholder: string
  }
  list: {
    daily: string
    shared: string
    share: string
  }
  lists: {
    manage: string
    title: string
    subtitle: string
    create: string
    namePlaceholder: string
    empty: string
    back: string
    backToToday: string
  }
  share: {
    title: string
    description: string
    create: string
    copy: string
    copied: string
    revoke: string
    empty: string
    readOnly: string
    editable: string
    join: string
    close: string
    role: string
    roleViewer: string
    roleEditor: string
    inviteTitle: string
    emailPlaceholder: string
    sendInvite: string
    invited: string
  }
  analytics: {
    manage: string
    title: string
    subtitle: string
    completed: string
    completionRate: string
    streak: string
    streakUnit: string
    perDay: string
    range7: string
    range30: string
    range90: string
    empty: string
    backToToday: string
  }
  status: {
    title: string
    subtitle: string
    operational: string
    degraded: string
    down: string
    componentUp: string
    componentDown: string
    lastChecked: string
    version: string
    backToApp: string
    components: {
      database: string
      cache: string
    }
  }
  ai: {
    manage: string
    title: string
    subtitle: string
    category: string
    categoryWedding: string
    categoryTrip: string
    categoryMoving: string
    categoryEvent: string
    categoryProject: string
    categoryOther: string
    listTitleLabel: string
    listTitlePlaceholder: string
    targetDate: string
    scale: string
    scaleSmall: string
    scaleMedium: string
    scaleLarge: string
    description: string
    descriptionPlaceholder: string
    generate: string
    generating: string
    draftTitle: string
    draftSubtitle: string
    taskPlaceholder: string
    addTask: string
    remove: string
    save: string
    saving: string
    regenerate: string
    error: string
    backToToday: string
  }
  auth: {
    createAccount: string
    createAccountSubtitle: string
    signIn: string
    signInSubtitle: string
    signOut: string
    email: string
    password: string
    showPassword: string
    hidePassword: string
    register: string
    continueWithGoogle: string
    haveAccount: string
    noAccount: string
    verifyTitle: string
    verifySubtitle: string
    code: string
    verify: string
    resend: string
    resent: string
    account: string
    guestBadge: string
    unverified: string
    verified: string
    verifyEmail: string
    displayName: string
    rename: string
    saved: string
    currentPassword: string
    newPassword: string
    changePassword: string
    deleteAccount: string
    deleteConfirm: string
    confirmDelete: string
    cancel: string
    close: string
    exportData: string
    exportDataHint: string
    photo: string
    changePhoto: string
    removePhoto: string
    photoHint: string
  }
}
