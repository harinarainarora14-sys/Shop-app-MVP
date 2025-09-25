import { cn } from "@/lib/utils"

export default function TestPage() {
  return (
    <div className={cn("p-8 text-center")}>
      <h1 className="text-2xl font-bold">Test Page</h1>
      <p>If you can see this, the cn function is working!</p>
    </div>
  )
}