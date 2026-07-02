import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function CompletePage() {
  return (
    <main className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>実験お疲れ様でした</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>ご協力ありがとうございました。</p>
          <p>
            すべての録音・解析データ・アンケート回答が送信されました。
            このタブは閉じていただいて問題ありません。
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
