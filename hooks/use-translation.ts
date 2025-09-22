"use client"

import { useState, useEffect } from "react"
import {
  translations,
  type SupportedLanguage,
  type TranslationKey,
  getTranslation,
  getCurrentLanguage,
} from "@/lib/i18n/translations"

export function useTranslation() {
  const [language, setLanguage] = useState<SupportedLanguage>("en")
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const currentLang = getCurrentLanguage()
    setLanguage(currentLang)
    setIsLoading(false)
  }, [])

  const t = (key: TranslationKey): string => {
    return getTranslation(language, key)
  }

  const changeLanguage = (newLanguage: SupportedLanguage) => {
    setLanguage(newLanguage)
    localStorage.setItem("preferred-language", newLanguage)
  }

  const formatDate = (date: Date | string): string => {
    const dateObj = typeof date === "string" ? new Date(date) : date

    const locales: Record<SupportedLanguage, string> = {
      en: "en-US",
      es: "es-ES",
      fr: "fr-FR",
      de: "de-DE",
      it: "it-IT",
      pt: "pt-PT",
      zh: "zh-CN",
      ja: "ja-JP",
      ko: "ko-KR",
      ar: "ar-SA",
      hi: "hi-IN",
      ru: "ru-RU",
    }

    return dateObj.toLocaleDateString(locales[language] || "en-US")
  }

  const formatCurrency = (amount: number): string => {
    const currencies: Record<SupportedLanguage, { currency: string; locale: string }> = {
      en: { currency: "USD", locale: "en-US" },
      es: { currency: "EUR", locale: "es-ES" },
      fr: { currency: "EUR", locale: "fr-FR" },
      de: { currency: "EUR", locale: "de-DE" },
      it: { currency: "EUR", locale: "it-IT" },
      pt: { currency: "EUR", locale: "pt-PT" },
      zh: { currency: "CNY", locale: "zh-CN" },
      ja: { currency: "JPY", locale: "ja-JP" },
      ko: { currency: "KRW", locale: "ko-KR" },
      ar: { currency: "SAR", locale: "ar-SA" },
      hi: { currency: "INR", locale: "hi-IN" },
      ru: { currency: "RUB", locale: "ru-RU" },
    }

    const { currency, locale } = currencies[language] || currencies.en

    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: currency,
    }).format(amount)
  }

  const getTimeAgo = (date: Date | string): string => {
    const dateObj = typeof date === "string" ? new Date(date) : date
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - dateObj.getTime()) / (1000 * 60 * 60))

    if (diffInHours < 1) return t("justNow")
    if (diffInHours < 24) return `${diffInHours} ${t("hoursAgo")}`
    if (diffInHours < 48) return t("yesterday")

    const diffInDays = Math.floor(diffInHours / 24)
    return `${diffInDays} ${t("daysAgo")}`
  }

  return {
    t,
    language,
    changeLanguage,
    isLoading,
    formatDate,
    formatCurrency,
    getTimeAgo,
    supportedLanguages: Object.keys(translations) as SupportedLanguage[],
  }
}
