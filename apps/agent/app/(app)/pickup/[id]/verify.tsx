import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { router, useLocalSearchParams } from "expo-router";
import { BASE_POINTS_PER_KG, QUALITY_MULTIPLIER, type MaterialGrade } from "@takacycle/types";
import { useAuth } from "../../../../lib/auth-context";
import { getCurrentCoordinates, type Coordinates } from "../../../../lib/location";
import { getAssignedPickup, submitPickupVerification, type AssignedPickup } from "../../../../lib/pickups";
import { useLocationReporting } from "../../../../lib/use-location-reporting";

import BackChevronIcon from "../../../../assets/verify-pickup/back-chevron.svg";
import CameraIcon from "../../../../assets/verify-pickup/camera-icon.svg";
import CameraCircleIcon from "../../../../assets/verify-pickup/camera-circle.svg";
import SackIcon from "../../../../assets/verify-pickup/sack-icon.svg";
import AlertCircleIcon from "../../../../assets/verify-pickup/alert-circle.svg";
import AlertIcon from "../../../../assets/verify-pickup/alert-02.svg";
import LocationIcon from "../../../../assets/verify-pickup/location-icon.svg";
import StarIcon from "../../../../assets/verify-pickup/star-icon.svg";
import CheckmarkVector from "../../../../assets/verify-pickup/checkmark-vector.svg";
import CancelIcon from "../../../../assets/verify-pickup/cancel-icon.svg";
import SuccessIllustration from "../../../../assets/verify-pickup/success-illustration.svg";

const GRADES: { value: MaterialGrade; label: string; color: string; bg: string }[] = [
  { value: "clean_pet", label: "Clean PET", color: "#3ea35f", bg: "rgba(110,255,158,0.1)" },
  { value: "mixed_recyclables", label: "Mixed", color: "#ffa702", bg: "rgba(255,167,2,0.1)" },
  { value: "contaminated", label: "Contaminated", color: "#e45959", bg: "rgba(255,135,135,0.1)" },
];

export default function VerifyPickupScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { profile } = useAuth();

  useLocationReporting(profile?.id, true);

  const [pickup, setPickup] = useState<AssignedPickup | null>(null);
  const [isLoadingPickup, setIsLoadingPickup] = useState(true);

  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [weightText, setWeightText] = useState("");
  const [grade, setGrade] = useState<MaterialGrade | null>(null);
  const [coords, setCoords] = useState<Coordinates | null>(null);
  const [locationNotice, setLocationNotice] = useState<string | null>(null);

  const [showConfirm, setShowConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ pointsAwarded: number; isAuditSample: boolean } | null>(null);

  useEffect(() => {
    getAssignedPickup(id)
      .then(setPickup)
      .finally(() => setIsLoadingPickup(false));
    getCurrentCoordinates().then(({ coords: c, error: err }) => {
      setCoords(c);
      setLocationNotice(err);
    });
  }, [id]);

  const weightKg = parseFloat(weightText);
  const isWeightValid = !Number.isNaN(weightKg) && weightKg > 0;
  const estimatedPoints = useMemo(() => {
    if (!isWeightValid || !grade) return null;
    return Math.round(weightKg * BASE_POINTS_PER_KG * QUALITY_MULTIPLIER[grade]);
  }, [isWeightValid, weightKg, grade]);

  async function handleTakePhoto() {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      setError("Camera permission is required to verify a pickup.");
      return;
    }
    const photo = await ImagePicker.launchCameraAsync({ quality: 0.7 });
    if (!photo.canceled && photo.assets[0]) {
      setPhotoUri(photo.assets[0].uri);
    }
  }

  function handleSubmitPress() {
    setError(null);
    if (!photoUri) {
      setError("Take a photo of the material and scale first.");
      return;
    }
    if (!isWeightValid) {
      setError("Enter the verified weight in kg.");
      return;
    }
    if (!grade) {
      setError("Select a quality grade.");
      return;
    }
    if (!coords) {
      setError("Location hasn't been captured yet — check location permissions.");
      return;
    }
    setShowConfirm(true);
  }

  async function handleConfirmSubmit() {
    if (!photoUri || !grade || !coords) return;
    setIsSubmitting(true);
    try {
      const submitResult = await submitPickupVerification({
        pickupId: id,
        photoUri,
        scaleReadingKg: weightKg,
        materialGrade: grade,
        gps: coords,
      });
      setResult(submitResult);
      setShowConfirm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit — try again.");
      setShowConfirm(false);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoadingPickup) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!pickup) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyText}>Pickup not found.</Text>
      </View>
    );
  }

  if (result) {
    return (
      <View style={styles.successScreen}>
        <SuccessIllustration width={150} height={150} />
        <Text style={styles.successTitle}>Pickup Submitted!</Text>
        <Text style={styles.successSubtitle}>
          {pickup.id.slice(0, 8).toUpperCase()} · synced to dispatcher
          {result.isAuditSample ? " · selected for quality audit" : ""}
        </Text>

        <View style={styles.successCard}>
          <View style={styles.successRow}>
            <Text style={styles.successRowLabel}>User</Text>
            <Text style={styles.successRowValue}>{pickup.requesterName}</Text>
          </View>
          <View style={styles.successRow}>
            <Text style={styles.successRowLabel}>Verified weight (kg)</Text>
            <Text style={styles.successRowValue}>{weightKg.toFixed(1)}</Text>
          </View>
          <View style={styles.successRow}>
            <Text style={styles.successRowLabel}>Quality grade</Text>
            <Text style={styles.successRowValue}>{GRADES.find((g) => g.value === grade)?.label}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.successRow}>
            <Text style={styles.successRowLabel}>Points awarded</Text>
            <Text style={styles.successPoints}>{result.pointsAwarded}</Text>
          </View>
        </View>

        <Pressable style={styles.primaryButtonFull} onPress={() => router.replace("/(app)")}>
          <Text style={styles.primaryButtonText}>Back to Homepage</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <BackChevronIcon width={36} height={36} />
        </Pressable>
        <Text style={styles.headerTitle}>Verify pickup</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.requesterCard}>
          <Text style={styles.requesterName}>{pickup.requesterName}</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.rowStart}>
            <CameraIcon width={16} height={16} />
            <Text style={styles.sectionLabel}>Take photo</Text>
          </View>
          <Pressable style={styles.photoBox} onPress={handleTakePhoto}>
            {photoUri ? (
              <Image source={{ uri: photoUri }} style={styles.photoPreview} resizeMode="cover" />
            ) : (
              <>
                <CameraCircleIcon width={80} height={80} />
                <Text style={styles.photoHint}>Tap a picture of the material and scale</Text>
              </>
            )}
          </Pressable>
        </View>

        <View style={styles.card}>
          <View style={styles.rowStart}>
            <SackIcon width={14} height={14} />
            <Text style={styles.sectionLabel}>Verified weight (kg)</Text>
          </View>
          <TextInput
            style={styles.weightInput}
            value={weightText}
            onChangeText={setWeightText}
            placeholder="0.0"
            keyboardType="decimal-pad"
          />
        </View>

        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <Text style={styles.sectionLabel}>Quality grade</Text>
            <View style={styles.rowStart}>
              <AlertCircleIcon width={10} height={10} />
              <Text style={styles.linkText}>What qualifies?</Text>
            </View>
          </View>
          <View style={styles.gradeRow}>
            {GRADES.map((g) => {
              const isSelected = grade === g.value;
              return (
                <Pressable
                  key={g.value}
                  style={[
                    styles.gradeChip,
                    { backgroundColor: g.bg },
                    isSelected && { borderWidth: 2, borderColor: g.color },
                  ]}
                  onPress={() => setGrade(g.value)}
                >
                  <Text style={styles.gradeChipLabel}>{g.label}</Text>
                  <Text style={[styles.gradeChipValue, { color: g.color }]}>{QUALITY_MULTIPLIER[g.value]}x</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.rowStart}>
            <StarIcon width={14} height={14} />
            <Text style={styles.sectionLabel}>Points preview</Text>
          </View>
          <Text style={styles.pointsPreviewCaption}>
            This earns {pickup.requesterName} approximately
          </Text>
          <View style={styles.pointsPreviewPill}>
            <Text style={styles.pointsPreviewText}>
              {estimatedPoints !== null ? `≈ ${estimatedPoints} Taka Points` : "Enter weight & grade"}
            </Text>
          </View>
        </View>

        <View style={styles.locationPill}>
          <LocationIcon width={16} height={16} />
          <Text style={styles.locationPillText}>
            {coords ? "Location recorded automatically" : locationNotice ?? "Getting location…"}
          </Text>
        </View>

        {error && <Text style={styles.errorText}>{error}</Text>}

        <Pressable style={styles.primaryButtonFull} onPress={handleSubmitPress}>
          <CheckmarkVector width={14} height={11} />
          <Text style={styles.primaryButtonText}>Submit Pickup</Text>
        </Pressable>
      </ScrollView>

      <Modal visible={showConfirm} transparent animationType="slide" onRequestClose={() => setShowConfirm(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Pressable style={styles.modalClose} onPress={() => setShowConfirm(false)}>
              <CancelIcon width={26} height={26} />
            </Pressable>
            <Text style={styles.modalTitle}>Confirm submission?</Text>
            <Text style={styles.modalSubtitle}>Confirm pickup details before you submit</Text>

            <View style={styles.modalCard}>
              <View style={styles.successRow}>
                <Text style={styles.successRowLabel}>Verified weight (kg)</Text>
                <Text style={styles.successRowValue}>{weightKg.toFixed(1)}</Text>
              </View>
              <View style={styles.successRow}>
                <Text style={styles.successRowLabel}>Quality grade</Text>
                <Text style={styles.successRowValue}>{GRADES.find((g) => g.value === grade)?.label}</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.successRow}>
                <Text style={styles.successRowLabel}>Points preview</Text>
                <Text style={styles.successPoints}>≈ {estimatedPoints}</Text>
              </View>
            </View>

            <View style={styles.rowStart}>
              <AlertIcon width={16} height={16} />
              <Text style={styles.modalWarning}>Submission is irreversible — only admin can override.</Text>
            </View>

            <Pressable style={styles.primaryButtonFull} onPress={handleConfirmSubmit} disabled={isSubmitting}>
              {isSubmitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <CheckmarkVector width={14} height={11} />
                  <Text style={styles.primaryButtonText}>Confirm & Submit</Text>
                </>
              )}
            </Pressable>
            <Pressable onPress={() => setShowConfirm(false)} disabled={isSubmitting}>
              <Text style={styles.modalCancel}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const GREEN = "#3ea35f";

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#fafafa" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  emptyText: { color: "#868686" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 16,
  },
  headerTitle: { fontSize: 16, fontWeight: "600", color: "#272727" },
  content: { padding: 20, gap: 14, paddingBottom: 40 },
  requesterCard: { backgroundColor: "#fff", borderRadius: 10, padding: 14 },
  requesterName: { fontSize: 14, color: "#272727" },
  card: { backgroundColor: "#fff", borderRadius: 14, padding: 16, gap: 12 },
  rowStart: { flexDirection: "row", alignItems: "center", gap: 6 },
  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  sectionLabel: { fontSize: 10, color: "#868686", fontWeight: "600", textTransform: "uppercase" },
  photoBox: {
    borderWidth: 2,
    borderColor: "#efefef",
    borderStyle: "dashed",
    borderRadius: 20,
    height: 193,
    alignItems: "center",
    justifyContent: "center",
    gap: 20,
    overflow: "hidden",
  },
  photoHint: { fontSize: 12, color: "#515050", textAlign: "center", width: 180 },
  photoPreview: { width: "100%", height: "100%" },
  weightInput: {
    backgroundColor: "#fafafa",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 16,
    color: "#272727",
  },
  linkText: { fontSize: 10, color: GREEN, fontWeight: "600" },
  gradeRow: { flexDirection: "row", gap: 12 },
  gradeChip: { flex: 1, borderRadius: 10, padding: 10, gap: 10 },
  gradeChipLabel: { fontSize: 8, color: "#868686", fontWeight: "600", textTransform: "uppercase" },
  gradeChipValue: { fontSize: 22, fontWeight: "500" },
  pointsPreviewCaption: { fontSize: 12, color: "#515050" },
  pointsPreviewPill: {
    backgroundColor: "rgba(110,255,158,0.1)",
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 10,
    alignSelf: "flex-start",
  },
  pointsPreviewText: { fontSize: 18, color: GREEN, fontWeight: "600" },
  locationPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#fff",
    borderRadius: 29,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignSelf: "flex-start",
  },
  locationPillText: { fontSize: 10, color: "#868686", textTransform: "uppercase" },
  errorText: { color: "#c0392b", fontSize: 13 },
  primaryButtonFull: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: GREEN,
    borderRadius: 30,
    paddingVertical: 14,
  },
  primaryButtonText: { color: "#fff", fontSize: 14, fontWeight: "600" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(27,27,27,0.4)", justifyContent: "flex-end" },
  modalSheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 24,
    gap: 16,
  },
  modalClose: { position: "absolute", right: 20, top: 20 },
  modalTitle: { fontSize: 20, fontWeight: "700", color: "#272727", textAlign: "center" },
  modalSubtitle: { fontSize: 12, color: "#868686", textAlign: "center", marginTop: -8 },
  modalCard: { backgroundColor: "#fafafa", borderRadius: 14, padding: 16, gap: 10 },
  modalWarning: { fontSize: 12, color: "#868686", flex: 1, textAlign: "center" },
  modalCancel: { fontSize: 14, color: "#515050", textAlign: "center" },
  successRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  successRowLabel: { fontSize: 12, color: "#868686" },
  successRowValue: { fontSize: 14, color: "#272727" },
  divider: { height: 1, backgroundColor: "#e9e9e9" },
  successPoints: { fontSize: 14, color: GREEN, fontWeight: "600" },
  successScreen: { flex: 1, backgroundColor: "#fff", alignItems: "center", justifyContent: "center", padding: 24, gap: 20 },
  successTitle: { fontSize: 20, fontWeight: "700", color: "#272727" },
  successSubtitle: { fontSize: 12, color: "#868686", textAlign: "center", marginTop: -12 },
  successCard: { backgroundColor: "#fafafa", borderRadius: 14, padding: 16, gap: 14, width: "100%" },
});
