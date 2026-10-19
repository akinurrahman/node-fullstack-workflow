# Example: form

The form component of the `academic` example. Columns and filters are inline in the list page, in `example-pages.md`.

`subjectOptionsSource` is in `example-api.md`. The folder tree is in `example-overview.md`.

## Class: form component

Fields come from `@/systems/form`. The cross-entity read is
`subjectOptionsSource`, imported relatively from the sibling entity in this same
feature. No `index.ts` involved, and the picker shares the cache with every
other subject picker.

`initialData` being present is the only create versus edit branch. The page
decides where success goes, so the same component works in a `FormSheet`.

### `components/classes/class-form.tsx`

```tsx
import { Form, FormActions, FormError, formFields } from '@/systems/form';
import { useCreateClass, useUpdateClass } from '../../api/class.mutations';
import { subjectOptionsSource } from '../../api/subject.queries';
import { classStatusLookup } from '../../definitions/class.lookup';
import {
  classFormSchema,
  type ClassFormInput,
} from '../../definitions/class.schema';
import type { ClassDetail } from '../../definitions/class.types';

// Typed to the schema: a name or dependsOn it does not have fails tsc.
const Field = formFields(classFormSchema);

type ClassFormProps = {
  initialData?: ClassDetail;
  onSuccess: () => void;
  onCancel: () => void;
};

export function ClassForm({
  initialData,
  onSuccess,
  onCancel,
}: ClassFormProps) {
  const createClass = useCreateClass();
  const updateClass = useUpdateClass(initialData?.id ?? '');
  const mutation = initialData ? updateClass : createClass;

  const defaultValues: Partial<ClassFormInput> = initialData
    ? {
        name: initialData.name,
        numericLevel: initialData.numericLevel,
        status: initialData.status,
        subjectIds: initialData.subjectIds,
        remarks: initialData.remarks ?? '',
      }
    : { status: classStatusLookup.keys.active };

  return (
    <Form
      schema={classFormSchema}
      defaultValues={defaultValues}
      onSubmit={async (values) => {
        await mutation.mutateAsync(values);
        onSuccess();
      }}
      className="grid gap-5"
    >
      <Field.Input
        name="name"
        label="Class name"
        placeholder="Class 10"
        required
      />
      <Field.Input name="numericLevel" label="Level" type="number" required />
      <Field.Select
        name="status"
        label="Status"
        options={classStatusLookup.options}
        required
      />
      <Field.AsyncSelect
        name="subjectIds"
        label="Subjects"
        source={subjectOptionsSource}
        initialOptions={initialData?.subjects.map((subject) => ({
          value: subject.id,
          label: subject.name,
        }))}
        multi
        required
      />
      <Field.Textarea name="remarks" label="Remarks" />

      <FormError />
      <FormActions
        submitLabel={initialData ? 'Save changes' : 'Create class'}
        isPending={mutation.isPending}
        onCancel={onCancel}
      />
    </Form>
  );
}
```

`onSubmit` awaits `mutateAsync` and lets it throw. On a rejection `Form` maps
the `ApiError`'s field errors onto the fields and the rest into `<FormError />`,
and `onSuccess` never runs, so the typed values stay on screen. `mutate` instead
of `mutateAsync` would resolve straight away, lose the field mapping, and fall
back to a toast.

Mapping the API shape to the form shape happens here, not in the page.
`initialOptions` gives the picker the names of the subjects already chosen, so
the chips do not show raw ids before the first fetch.
