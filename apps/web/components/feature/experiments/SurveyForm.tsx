import { useFormContext, Controller } from "react-hook-form";
import { IonItem, IonSelect, IonSelectOption, IonInput, IonNote } from "@ionic/react";

const FIVE_LABELS: Record<number, string> = {
  1: "1: まったくそう思わない",
  2: "2: あまりそう思わない",
  3: "3: どちらともいえない",
  4: "4: ややそう思う",
  5: "5: とてもそう思う",
};

export function FivePointField({
  name,
  label,
}: {
  name: string;
  label: string;
}) {
  const { control } = useFormContext();
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <>
          <IonItem lines="none">
            <IonSelect
              label={label}
              labelPlacement="stacked"
              placeholder="5段階で選択"
              value={field.value ?? undefined}
              onIonChange={(e) => field.onChange(Number(e.detail.value))}
            >
              {[1, 2, 3, 4, 5].map((n) => (
                <IonSelectOption key={n} value={n}>
                  {FIVE_LABELS[n]}
                </IonSelectOption>
              ))}
            </IonSelect>
          </IonItem>
          {fieldState.error?.message && (
            <IonNote color="danger">{fieldState.error.message}</IonNote>
          )}
        </>
      )}
    />
  );
}

export function FreeTextField({
  name,
  label,
}: {
  name: string;
  label: string;
}) {
  const { control } = useFormContext();
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <>
          <IonItem lines="none">
            <IonInput
              label={label}
              labelPlacement="stacked"
              type="text"
              placeholder="任意"
              value={(field.value as string | undefined) ?? ""}
              onIonInput={(e) => field.onChange(e.detail.value)}
            />
          </IonItem>
          {fieldState.error?.message && (
            <IonNote color="danger">{fieldState.error.message}</IonNote>
          )}
        </>
      )}
    />
  );
}
