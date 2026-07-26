// app/components/AddressSheet.tsx

import React, { useEffect, useMemo, useState } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Alert,
} from "react-native";

export type AddressPayload = {
  name: string;
  email: string;
  phone: string;
  address1: string;
  address2?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
};

type SubmitHandler = (
  addr: AddressPayload
) => void | Promise<void>;

type Props = {
  visible: boolean;
  onClose: () => void;

  /**
   * Canonical submit callback used by the current Shop screen.
   */
  onConfirm?: SubmitHandler;

  /**
   * Backward-compatible alias for older Shop builds.
   * Keeping this prevents an undefined-callback crash if an older caller
   * still sends onSubmit instead of onConfirm.
   */
  onSubmit?: SubmitHandler;

  /**
   * Optional initial values, usually populated from UserContext.
   */
  initialValues?: Partial<AddressPayload>;

  /**
   * Primary button label.
   * Default: "Continue to billing"
   */
  primaryLabel?: string;

  /**
   * Canonical loading prop.
   */
  submitting?: boolean;

  /**
   * Backward-compatible alias used by older Shop builds.
   */
  loading?: boolean;

  /**
   * Accepted for backward compatibility with older callers.
   * The address form does not need to render the balance.
   */
  coinBalance?: number;
};

const EMPTY_FORM: AddressPayload = {
  name: "",
  email: "",
  phone: "",
  address1: "",
  address2: "",
  city: "",
  state: "",
  zip: "",
  country: "",
};

function cleanValue(value: unknown): string {
  return value == null ? "" : String(value);
}

function normalizeAddress(
  form: AddressPayload
): AddressPayload {
  return {
    name: form.name.trim(),
    email: form.email.trim().toLowerCase(),
    phone: form.phone.trim(),
    address1: form.address1.trim(),
    address2: cleanValue(form.address2).trim(),
    city: cleanValue(form.city).trim(),
    state: cleanValue(form.state).trim(),
    zip: cleanValue(form.zip).trim(),
    country: cleanValue(form.country).trim(),
  };
}

export default function AddressSheet({
  visible,
  onClose,
  onConfirm,
  onSubmit,
  initialValues,
  primaryLabel = "Continue to billing",
  submitting = false,
  loading = false,
}: Props) {
  const [form, setForm] =
    useState<AddressPayload>(EMPTY_FORM);

  const [localSubmitting, setLocalSubmitting] =
    useState(false);

  const busy =
    submitting || loading || localSubmitting;

  const submitHandler = onConfirm ?? onSubmit;

  /**
   * Hydrate only when the sheet opens or initial values change.
   * Existing typed values are preserved unless an explicit initial value
   * was supplied for that field.
   */
  useEffect(() => {
    if (!visible) return;

    setForm((prev) => ({
      ...prev,
      ...initialValues,
      name: cleanValue(
        initialValues?.name ?? prev.name
      ),
      email: cleanValue(
        initialValues?.email ?? prev.email
      ),
      phone: cleanValue(
        initialValues?.phone ?? prev.phone
      ),
      address1: cleanValue(
        initialValues?.address1 ?? prev.address1
      ),
      address2: cleanValue(
        initialValues?.address2 ?? prev.address2
      ),
      city: cleanValue(
        initialValues?.city ?? prev.city
      ),
      state: cleanValue(
        initialValues?.state ?? prev.state
      ),
      zip: cleanValue(
        initialValues?.zip ?? prev.zip
      ),
      country: cleanValue(
        initialValues?.country ?? prev.country
      ),
    }));
  }, [visible, initialValues]);

  const updateField = (
    key: keyof AddressPayload,
    value: string
  ) => {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const canSubmit = useMemo(
    () =>
      Boolean(
        form.name.trim() &&
          form.email.trim() &&
          form.phone.trim() &&
          form.address1.trim() &&
          cleanValue(form.city).trim() &&
          cleanValue(form.state).trim() &&
          cleanValue(form.zip).trim()
      ),
    [form]
  );

  const handleConfirm = async () => {
    if (!canSubmit || busy) return;

    if (typeof submitHandler !== "function") {
      console.error(
        "[AddressSheet] No onConfirm/onSubmit callback was provided."
      );

      Alert.alert(
        "Unable to place order",
        "The shipping form could not connect to the shop. Please close it and try again."
      );
      return;
    }

    try {
      setLocalSubmitting(true);
      await Promise.resolve(
        submitHandler(normalizeAddress(form))
      );
    } catch (error) {
      /**
       * The Shop screen normally owns the order-error alert.
       * This catch prevents an unhandled promise rejection if another caller
       * uses AddressSheet without its own error handling.
       */
      console.warn(
        "[AddressSheet] submit callback failed:",
        error
      );
    } finally {
      setLocalSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={() => {
        if (!busy) onClose();
      }}
      presentationStyle="pageSheet"
    >
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={
          Platform.OS === "ios"
            ? "padding"
            : undefined
        }
      >
        <View style={styles.header}>
          <Text style={styles.title}>
            Shipping details
          </Text>

          <Text style={styles.subtitle}>
            We’ll only use this to ship your order
            and send an email receipt.
          </Text>
        </View>

        <ScrollView
          contentContainerStyle={styles.body}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Field
            label="Full name"
            value={form.name}
            autoCapitalize="words"
            textContentType="name"
            autoComplete="name"
            returnKeyType="next"
            editable={!busy}
            onChangeText={(text) =>
              updateField("name", text)
            }
          />

          <Field
            label="Email"
            value={form.email}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            textContentType="emailAddress"
            autoComplete="email"
            returnKeyType="next"
            editable={!busy}
            onChangeText={(text) =>
              updateField("email", text)
            }
          />

          <Field
            label="Phone"
            value={form.phone}
            keyboardType="phone-pad"
            textContentType="telephoneNumber"
            autoComplete="tel"
            returnKeyType="next"
            editable={!busy}
            onChangeText={(text) =>
              updateField("phone", text)
            }
          />

          <Field
            label="Address line 1"
            value={form.address1}
            autoCapitalize="words"
            textContentType="streetAddressLine1"
            autoComplete="address-line1"
            returnKeyType="next"
            editable={!busy}
            onChangeText={(text) =>
              updateField("address1", text)
            }
          />

          <Field
            label="Address line 2"
            value={form.address2 ?? ""}
            autoCapitalize="words"
            textContentType="streetAddressLine2"
            autoComplete="address-line2"
            returnKeyType="next"
            editable={!busy}
            onChangeText={(text) =>
              updateField("address2", text)
            }
          />

          <Field
            label="City"
            value={form.city ?? ""}
            autoCapitalize="words"
            textContentType="addressCity"
            autoComplete="postal-address-locality"
            returnKeyType="next"
            editable={!busy}
            onChangeText={(text) =>
              updateField("city", text)
            }
          />

          <Field
            label="State/Province"
            value={form.state ?? ""}
            autoCapitalize="characters"
            textContentType="addressState"
            autoComplete="postal-address-region"
            returnKeyType="next"
            editable={!busy}
            onChangeText={(text) =>
              updateField("state", text)
            }
          />

          <Field
            label="Postal / ZIP"
            value={form.zip ?? ""}
            keyboardType="numbers-and-punctuation"
            textContentType="postalCode"
            autoComplete="postal-code"
            returnKeyType="next"
            editable={!busy}
            onChangeText={(text) =>
              updateField("zip", text)
            }
          />

          <Field
            label="Country"
            value={form.country ?? ""}
            autoCapitalize="words"
            textContentType="countryName"
            autoComplete="country"
            returnKeyType="done"
            editable={!busy}
            onSubmitEditing={() => {
              void handleConfirm();
            }}
            onChangeText={(text) =>
              updateField("country", text)
            }
          />
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[
              styles.button,
              styles.ghostButton,
            ]}
            onPress={onClose}
            disabled={busy}
            accessibilityRole="button"
            accessibilityLabel="Cancel shipping form"
          >
            <Text style={styles.ghostButtonText}>
              Cancel
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.button,
              canSubmit &&
              !busy &&
              typeof submitHandler === "function"
                ? styles.primaryButton
                : styles.disabledButton,
            ]}
            onPress={() => {
              void handleConfirm();
            }}
            disabled={
              !canSubmit ||
              busy ||
              typeof submitHandler !== "function"
            }
            accessibilityRole="button"
            accessibilityLabel={primaryLabel}
          >
            <Text style={styles.buttonText}>
              {busy
                ? "Submitting..."
                : primaryLabel}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function Field({
  label,
  ...rest
}: {
  label: string;
} & React.ComponentProps<typeof TextInput>) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>
        {label}
      </Text>

      <TextInput
        placeholderTextColor="#7aa8b0"
        style={styles.input}
        {...rest}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  keyboardView: {
    flex: 1,
    backgroundColor: "#071018",
  },
  header: {
    paddingTop: 12,
    paddingHorizontal: 16,
  },
  title: {
    color: "#eaffff",
    fontSize: 22,
    fontWeight: "800",
  },
  subtitle: {
    color: "#9fe6ff",
    fontSize: 13,
    marginTop: 4,
    marginBottom: 4,
  },
  body: {
    padding: 16,
    paddingBottom: 28,
  },
  field: {
    marginBottom: 12,
  },
  label: {
    color: "#9fe6ff",
    marginBottom: 6,
    fontSize: 14,
    fontWeight: "600",
  },
  input: {
    backgroundColor: "rgba(0,229,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(0,229,255,0.35)",
    borderRadius: 10,
    color: "#eaffff",
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  footer: {
    padding: 16,
    gap: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(0,229,255,0.18)",
    backgroundColor: "#071018",
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  primaryButton: {
    backgroundColor: "#00e5ff",
  },
  disabledButton: {
    backgroundColor: "rgba(0,229,255,0.25)",
  },
  buttonText: {
    color: "#00141a",
    fontWeight: "800",
    fontSize: 16,
  },
  ghostButton: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
  },
  ghostButtonText: {
    color: "#eaffff",
    fontWeight: "700",
    fontSize: 16,
  },
});