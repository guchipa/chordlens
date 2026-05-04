"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ExperimentInvalidPage() {
  return (
    <main className="container mx-auto max-w-2xl p-6">
      <Card>
        <CardHeader>
          <CardTitle>URL が無効です</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            URL に必要なパラメータ (<code>cond</code> と <code>pairId</code>) が含まれていません。
          </p>
          <p>
            実験者から配布された URL を再度確認してください。
          </p>
          <p className="text-muted-foreground">
            例: <code>/experiments/?cond=with&amp;pairId=PR01</code>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
