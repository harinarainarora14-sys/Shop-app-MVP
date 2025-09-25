"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Mail } from "lucide-react"

export default function VerifyEmailPage() {
  return (
    <div className="flex min-h-screen w-full items-center justify-center p-6 bg-background">
      <div className="w-full max-w-sm">
        <div className="flex flex-col gap-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-primary">ShopConnect</h1>
            <p className="text-muted-foreground">Connect with local shops</p>
          </div>
          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <Mail className="h-6 w-6 text-primary" />
              </div>
              <CardTitle className="text-2xl">Check your email</CardTitle>
              <CardDescription>We&apos;ve sent you a verification link to complete your registration</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground text-center">
                Please check your email and click the verification link to activate your account. You can close this
                window once you&apos;ve verified your email.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
