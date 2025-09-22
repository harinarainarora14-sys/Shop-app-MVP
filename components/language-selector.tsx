"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { motion } from "framer-motion"
import { Globe, Check } from "lucide-react"

interface Language {
  code: string
  name: string
  nativeName: string
  flag: string
}

const SUPPORTED_LANGUAGES: Language[] = [
  { code: "en", name: "English", nativeName: "English", flag: "🇺🇸" },
  { code: "es", name: "Spanish", nativeName: "Español", flag: "🇪🇸" },
  { code: "fr", name: "French", nativeName: "Français", flag: "🇫🇷" },
  { code: "de", name: "German", nativeName: "Deutsch", flag: "🇩🇪" },
  { code: "it", name: "Italian", nativeName: "Italiano", flag: "🇮🇹" },
  { code: "pt", name: "Portuguese", nativeName: "Português", flag: "🇵🇹" },
  { code: "zh", name: "Chinese", nativeName: "中文", flag: "🇨🇳" },
  { code: "ja", name: "Japanese", nativeName: "日本語", flag: "🇯🇵" },
  { code: "ko", name: "Korean", nativeName: "한국어", flag: "🇰🇷" },
  { code: "ar", name: "Arabic", nativeName: "العربية", flag: "🇸🇦" },
  { code: "hi", name: "Hindi", nativeName: "हिन्दी", flag: "🇮🇳" },
  { code: "ru", name: "Russian", nativeName: "Русский", flag: "🇷🇺" },
]

interface LanguageSelectorProps {
  currentLanguage?: string
  onLanguageChange?: (language: string) => void
  compact?: boolean
}

export function LanguageSelector({ currentLanguage = "en", onLanguageChange, compact = false }: LanguageSelectorProps) {
  const [selectedLanguage, setSelectedLanguage] = useState(currentLanguage)
  const [isChanging, setIsChanging] = useState(false)

  useEffect(() => {
    setSelectedLanguage(currentLanguage)
  }, [currentLanguage])

  const handleLanguageChange = async (languageCode: string) => {
    if (languageCode === selectedLanguage) return

    setIsChanging(true)
    setSelectedLanguage(languageCode)

    // Store language preference
    localStorage.setItem("preferred-language", languageCode)

    // Call parent callback
    if (onLanguageChange) {
      onLanguageChange(languageCode)
    }

    // Simulate language loading time
    setTimeout(() => {
      setIsChanging(false)
    }, 500)
  }

  const getCurrentLanguage = () => {
    return SUPPORTED_LANGUAGES.find((lang) => lang.code === selectedLanguage) || SUPPORTED_LANGUAGES[0]
  }

  if (compact) {
    return (
      <Select value={selectedLanguage} onValueChange={handleLanguageChange}>
        <SelectTrigger className="w-auto h-10 rounded-2xl border-2 bg-transparent">
          <div className="flex items-center gap-2">
            <span className="text-lg">{getCurrentLanguage().flag}</span>
            <SelectValue />
          </div>
        </SelectTrigger>
        <SelectContent className="rounded-2xl">
          {SUPPORTED_LANGUAGES.map((language) => (
            <SelectItem key={language.code} value={language.code} className="text-base">
              <div className="flex items-center gap-3">
                <span className="text-lg">{language.flag}</span>
                <div>
                  <div className="font-medium">{language.nativeName}</div>
                  <div className="text-sm text-muted-foreground">{language.name}</div>
                </div>
                {language.code === selectedLanguage && <Check className="h-4 w-4 text-primary ml-auto" />}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Globe className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold text-foreground">Language / Idioma / Langue</h3>
        {isChanging && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {SUPPORTED_LANGUAGES.map((language) => (
          <motion.div key={language.code} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button
              variant={selectedLanguage === language.code ? "default" : "outline"}
              onClick={() => handleLanguageChange(language.code)}
              disabled={isChanging}
              className={`
                w-full h-auto p-4 rounded-2xl border-2 transition-all duration-200
                ${
                  selectedLanguage === language.code
                    ? "bg-primary text-primary-foreground border-primary shadow-lg"
                    : "bg-transparent hover:bg-secondary/50"
                }
              `}
            >
              <div className="flex items-center gap-3 w-full">
                <span className="text-2xl">{language.flag}</span>
                <div className="text-left flex-1">
                  <div className="font-semibold text-base">{language.nativeName}</div>
                  <div
                    className={`text-sm ${
                      selectedLanguage === language.code ? "text-primary-foreground/80" : "text-muted-foreground"
                    }`}
                  >
                    {language.name}
                  </div>
                </div>
                {selectedLanguage === language.code && <Check className="h-5 w-5 text-primary-foreground" />}
              </div>
            </Button>
          </motion.div>
        ))}
      </div>

      <div className="p-4 bg-muted/30 rounded-2xl border">
        <div className="flex items-start gap-3">
          <Globe className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-medium text-foreground mb-2">Multilingual Support</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Interface elements and navigation will be translated</li>
              <li>• Product names and descriptions remain in original language</li>
              <li>• Date and number formats adapt to selected language</li>
              <li>• More languages coming soon based on user feedback</li>
            </ul>
          </div>
        </div>
      </div>

      {selectedLanguage !== "en" && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Badge variant="secondary" className="rounded-xl px-3 py-2">
            <Globe className="h-3 w-3 mr-1" />
            Language: {getCurrentLanguage().nativeName}
          </Badge>
        </motion.div>
      )}
    </div>
  )
}
