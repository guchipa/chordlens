import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function IneligiblePage() {
  return (
    <main className="container mx-auto max-w-2xl p-6">
      <Card>
        <CardHeader>
          <CardTitle>参加条件外です</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            本実験は演奏歴 1 年以上の管楽器経験者を対象としています。
            ご回答いただいた内容では参加条件を満たさないため、ここで終了とさせていただきます。
          </p>
          <p>ご協力ありがとうございました。</p>
        </CardContent>
      </Card>
    </main>
  );
}
