// src/components/ReusableForm.tsx
import React from "react";
import {
  useForm,
  type FieldApi,
  type FormApi,
} from "@tanstack/react-form";
import { z, type ZodTypeAny } from "zod";
import { zodValidator } from "@tanstack/zod-form-adapter";

type FieldType = "text" | "email" | "number" | "textarea";

export interface FieldConfig {
  name: string;
  label: string;
  type?: FieldType;
  placeholder?: string;
}

interface ReusableFormProps<TValues extends Record<string, any>> {
  schema: z.ZodType<TValues, any, any>;
  defaultValues: TValues;
  fields: FieldConfig[];
  onSubmit: (values: TValues) => Promise<void> | void;
  submitLabel?: string;
  className?: string;
}

export function ReusableForm<TValues extends Record<string, any>>({
  schema,
  defaultValues,
  fields,
  onSubmit,
  submitLabel = "Submit",
  className = "",
}: ReusableFormProps<TValues>) {
  const form = useForm<TValues>({
    defaultValues,
    onSubmit: async ({ value }) => {
      await onSubmit(value);
    },
    validatorAdapter: zodValidator(),
  });

  return (
    <div
      className={
        "max-w-xl mx-auto p-6 bg-white shadow rounded-xl " + className
      }
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          form.handleSubmit();
        }}
        className="space-y-4"
      >
        {fields.map((fieldCfg) => (
          <form.Field
            key={fieldCfg.name}
            name={fieldCfg.name as any}
            children={(field) => (
              <FormFieldInput field={field} config={fieldCfg} />
            )}
          />
        ))}

        <form.Subscribe
          selector={(state) => ({
            isSubmitting: state.isSubmitting,
          })}
        >
          {({ isSubmitting }) => (
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-60"
            >
              {isSubmitting ? "Saving..." : submitLabel}
            </button>
          )}
        </form.Subscribe>
      </form>
    </div>
  );
}

/* ---------- Internal field renderer ---------- */

interface FormFieldInputProps {
  field: FieldApi<any, any, any, any>;
  config: FieldConfig;
}

function FormFieldInput({ field, config }: FormFieldInputProps) {
  const { label, type = "text", placeholder } = config;
  const error = field.state.meta.errors?.[0];

  const commonProps = {
    className:
      "w-full border px-3 py-2 rounded outline-none focus:ring focus:ring-blue-200",
    value: field.state.value ?? "",
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      field.handleChange(e.target.value),
    placeholder,
  };

  return (
    <div>
      <label className="block font-medium mb-1">{label}</label>

      {type === "textarea" ? (
        <textarea {...commonProps} rows={3} />
      ) : (
        <input
          {...commonProps}
          type={type}
        />
      )}

      {error && (
        <p className="text-red-500 text-sm mt-1">
          {String(error)}
        </p>
      )}
    </div>
  );
}
