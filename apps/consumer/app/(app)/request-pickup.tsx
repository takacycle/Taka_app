import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { router } from "expo-router";
import { useAuth } from "../../lib/auth-context";
import { getZone, type Zone } from "../../lib/zones";
import { nextPickupDates, type PickupDateOption } from "../../lib/dates";
import { getCurrentCoordinates, type Coordinates } from "../../lib/location";
import { supabase } from "../../lib/supabase";
import { StepProgress } from "../../components/request-pickup/StepProgress";
import { Card } from "../../components/request-pickup/Card";
import { SectionLabel } from "../../components/request-pickup/SectionLabel";

import BackChevronIcon from "../../assets/request-pickup/back-chevron.svg";
import ZoneIcon from "../../assets/request-pickup/zone-icon.svg";
import EditIcon from "../../assets/request-pickup/edit-icon.svg";
import LocationIcon from "../../assets/request-pickup/location-icon.svg";
import CalendarIcon from "../../assets/request-pickup/calendar-icon.svg";
import AlertIcon from "../../assets/request-pickup/alert-icon.svg";
import NoteIcon from "../../assets/request-pickup/note-icon.svg";
import MaterialIcon from "../../assets/request-pickup/material-icon.svg";
import MinusIcon from "../../assets/request-pickup/minus-icon.svg";
import PlusIcon from "../../assets/request-pickup/plus-icon.svg";
import SackIcon from "../../assets/request-pickup/sack-icon.svg";
import CheckIcon from "../../assets/request-pickup/check-icon.svg";
import PreviewIcon from "../../assets/request-pickup/preview-icon.svg";
import CheckmarkVector from "../../assets/request-pickup/checkmark-vector.svg";
import BackButtonChevron from "../../assets/request-pickup/back-button-chevron.svg";
import NextChevron from "../../assets/request-pickup/chevron.svg";

const bottlePhoto = require("../../assets/request-pickup/bottle-photo.png");

const ACCEPTED_MATERIALS = [
  { name: "PET bottles", rate: "100 points / kg", description: "Water bottles, soft drink bottles, juice bottles" },
  { name: "HDPE Containers", rate: "80 points / kg", description: "Water bottles, soft drink bottles, juice bottles" },
  { name: "Sachet water bags", rate: "60 points / kg", description: "Water bottles, soft drink bottles, juice bottles" },
  { name: "Mixed plastics", rate: "50 points / kg", description: "Water bottles, soft drink bottles, juice bottles" },
];

const QUALITY_TIERS = [
  { label: "Clean PET (points)", value: "1.0x", bg: "rgba(110,255,158,0.1)", color: "#3ea35f" },
  { label: "Mixed (points)", value: "0.7x", bg: "rgba(255,167,2,0.1)", color: "#ffa702" },
  { label: "Contaminated (points)", value: "0.3x", bg: "rgba(255,135,135,0.1)", color: "#e45959" },
];

const MIN_SACKS = 1;
const MAX_SACKS = 10;
const AVG_KG_PER_SACK = 2.5;
// Illustrative only — real points are awarded after the agent verifies weight and
// quality at pickup (see the review-step disclaimer below).
const ESTIMATE_POINTS_PER_KG = 60;

type Step = 1 | 2 | 3;

export default function RequestPickupScreen() {
  const { session, profile } = useAuth();

  const [step, setStep] = useState<Step>(1);
  const [zone, setZone] = useState<Zone | null>(null);
  const [isLoadingZone, setIsLoadingZone] = useState(true);

  const [addressText, setAddressText] = useState("");
  const [coords, setCoords] = useState<Coordinates | null>(null);
  const [isFetchingLocation, setIsFetchingLocation] = useState(false);
  const [locationNotice, setLocationNotice] = useState<string | null>(null);

  const [dateOptions, setDateOptions] = useState<PickupDateOption[]>([]);
  const [selectedDateIndex, setSelectedDateIndex] = useState<number | null>(null);
  const [notes, setNotes] = useState("");

  const [sackCount, setSackCount] = useState(2);
  const [qualityConfirmed, setQualityConfirmed] = useState(false);

  const [stepError, setStepError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!profile?.zoneId) {
      setIsLoadingZone(false);
      return;
    }
    setIsLoadingZone(true);
    getZone(profile.zoneId)
      .then((z) => {
        setZone(z);
        const options = z ? nextPickupDates(z.pickupDays, 5) : [];
        setDateOptions(options);
        setSelectedDateIndex(options.length > 0 ? 0 : null);
      })
      .finally(() => setIsLoadingZone(false));
  }, [profile?.zoneId]);

  const estimatedPoints = useMemo(
    () => Math.round(sackCount * AVG_KG_PER_SACK * ESTIMATE_POINTS_PER_KG),
    [sackCount],
  );
  const estimatedKg = useMemo(() => (sackCount * AVG_KG_PER_SACK).toFixed(1), [sackCount]);
  const selectedDate = selectedDateIndex !== null ? dateOptions[selectedDateIndex] : null;

  async function handleUseCurrentLocation() {
    setIsFetchingLocation(true);
    setLocationNotice(null);
    const { coords: result, error } = await getCurrentCoordinates();
    setIsFetchingLocation(false);
    if (result) {
      setCoords(result);
      setLocationNotice("Current location captured.");
    } else {
      setLocationNotice(error);
    }
  }

  function goBack() {
    if (step > 1) {
      setStepError(null);
      setStep((s) => (s - 1) as Step);
    } else {
      router.back();
    }
  }

  function handleNextFromStep1() {
    if (!addressText.trim()) {
      setStepError("Enter your pickup address.");
      return;
    }
    if (!coords) {
      setStepError('Tap "Use Current Location" so your agent can find you.');
      return;
    }
    if (!selectedDate) {
      setStepError("Select a pickup date.");
      return;
    }
    setStepError(null);
    setStep(2);
  }

  function handleNextFromStep2() {
    if (!qualityConfirmed) {
      setStepError("Confirm your plastics meet the quality requirements.");
      return;
    }
    setStepError(null);
    setStep(3);
  }

  async function handleConfirm() {
    if (!session || !zone || !coords || !selectedDate) return;

    setIsSubmitting(true);
    setSubmitError(null);

    const { error } = await supabase.from("pickups").insert({
      user_id: session.user.id,
      zone_id: zone.id,
      status: "requested",
      scheduled_at: selectedDate.date.toISOString(),
      pickup_location: `SRID=4326;POINT(${coords.lng} ${coords.lat})`,
      address_text: addressText.trim(),
      notes: notes.trim() || null,
      sack_count: sackCount,
    });

    setIsSubmitting(false);

    if (error) {
      setSubmitError(error.message);
      return;
    }
    setSubmitted(true);
  }

  if (isLoadingZone) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!zone) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyTitle}>No zone set yet</Text>
        <Text style={styles.emptySubtitle}>Pick your zone so we know when and where we can collect from you.</Text>
        <Pressable style={styles.primaryButton} onPress={() => router.push("/(app)/select-zone")}>
          <Text style={styles.primaryButtonText}>Select your zone</Text>
        </Pressable>
      </View>
    );
  }

  if (submitted) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyTitle}>Request submitted</Text>
        <Text style={styles.emptySubtitle}>
          You'll be notified once an agent is on their way. Points are awarded after they verify your plastics.
        </Text>
        <Pressable style={styles.primaryButton} onPress={() => router.replace("/(app)")}>
          <Text style={styles.primaryButtonText}>Done</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Pressable onPress={goBack} hitSlop={8}>
          <BackChevronIcon width={36} height={36} />
        </Pressable>
        <Text style={styles.headerTitle}>Request Pickup</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {step === 1 && (
          <StepProgress label="Confirm details" currentStep={1} />
        )}
        {step === 2 && <StepProgress label="Sack Confirmation" currentStep={2} />}
        {step === 3 && <StepProgress label="Review & Confirm" currentStep={3} />}

        {step === 1 && (
          <>
            <Card style={{ gap: 10 }}>
              <SectionLabel icon={ZoneIcon}>Your zone</SectionLabel>
              <View style={styles.rowBetween}>
                <Text style={styles.value}>{zone.name}</Text>
                <Pressable style={styles.editChip} onPress={() => router.push("/(app)/select-zone")}>
                  <EditIcon width={16} height={16} />
                  <Text style={styles.editChipText}>Edit</Text>
                </Pressable>
              </View>
              {zone.pickupDays.length > 0 && (
                <View style={styles.pillRow}>
                  <Text style={styles.pillText}>
                    PICKUPS:{" "}
                    {zone.pickupDays
                      .map((d) => WEEKDAY_NAMES[d])
                      .join(" & ")}
                  </Text>
                </View>
              )}
            </Card>

            <Card style={{ gap: 10 }}>
              <SectionLabel icon={LocationIcon}>Pickup address</SectionLabel>
              <TextInput
                style={styles.addressInput}
                value={addressText}
                onChangeText={setAddressText}
                placeholder="House number, street, landmark"
                multiline
              />
              <Pressable style={styles.rowStart} onPress={handleUseCurrentLocation} disabled={isFetchingLocation}>
                <LocationIcon width={16} height={16} />
                {isFetchingLocation ? (
                  <ActivityIndicator size="small" />
                ) : (
                  <Text style={styles.linkText}>Use Current Location</Text>
                )}
              </Pressable>
              {locationNotice && <Text style={styles.hintText}>{locationNotice}</Text>}
            </Card>

            <Card style={{ gap: 10 }}>
              <View style={styles.rowBetween}>
                <SectionLabel icon={CalendarIcon}>Select date</SectionLabel>
                <Text style={styles.smallCaps}>Min. 24h notice</Text>
              </View>
              {dateOptions.length === 0 ? (
                <Text style={styles.hintText}>No upcoming pickup days configured for this zone yet.</Text>
              ) : (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
                  {dateOptions.map((option, index) => {
                    const isSelected = index === selectedDateIndex;
                    return (
                      <Pressable
                        key={option.isoDate}
                        style={[styles.dateChip, isSelected && styles.dateChipSelected]}
                        onPress={() => setSelectedDateIndex(index)}
                      >
                        <Text style={[styles.dateChipWeekday, isSelected && styles.dateChipTextSelected]}>
                          {option.weekdayLabel}
                        </Text>
                        <Text style={[styles.dateChipDay, isSelected && styles.dateChipTextSelected]}>
                          {option.dayOfMonth}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              )}
              <View style={styles.pillRow}>
                <AlertIcon width={10} height={10} />
                <Text style={styles.pillTextSmall}>Only your zone's pickup days are available.</Text>
              </View>
            </Card>

            <Card style={{ gap: 10 }}>
              <SectionLabel icon={NoteIcon}>Notes for agent (optional)</SectionLabel>
              <TextInput
                style={styles.notesInput}
                value={notes}
                onChangeText={setNotes}
                placeholder="Give your agent further info..."
                multiline
              />
            </Card>

            {stepError && <Text style={styles.errorText}>{stepError}</Text>}

            <Pressable style={styles.primaryButtonFull} onPress={handleNextFromStep1}>
              <Text style={styles.primaryButtonText}>Next</Text>
              <NextChevron width={6} height={12} style={{ transform: [{ rotate: "180deg" }] }} />
            </Pressable>
          </>
        )}

        {step === 2 && (
          <>
            <Card style={{ gap: 10 }}>
              <SectionLabel icon={MaterialIcon}>Accepted plastics</SectionLabel>
              {ACCEPTED_MATERIALS.map((material) => (
                <View key={material.name} style={styles.materialRow}>
                  <Image source={bottlePhoto} style={styles.materialPhoto} resizeMode="cover" />
                  <View style={{ flex: 1, gap: 3 }}>
                    <Text style={styles.materialName}>{material.name}</Text>
                    <Text style={styles.materialRate}>{material.rate}</Text>
                    <Text style={styles.materialDescription}>{material.description}</Text>
                  </View>
                </View>
              ))}
            </Card>

            <Card style={{ gap: 14 }}>
              <SectionLabel icon={SackIcon}>How many sacks are ready?</SectionLabel>
              <Text style={styles.hintTextCenter}>Min 1 · Max 10 (pilot phase)</Text>
              <View style={styles.stepperRow}>
                <Pressable
                  style={styles.stepperButton}
                  onPress={() => setSackCount((c) => Math.max(MIN_SACKS, c - 1))}
                >
                  <MinusIcon width={24} height={24} />
                </Pressable>
                <Text style={styles.stepperValue}>{sackCount}</Text>
                <Pressable
                  style={styles.stepperButton}
                  onPress={() => setSackCount((c) => Math.min(MAX_SACKS, c + 1))}
                >
                  <PlusIcon width={24} height={24} />
                </Pressable>
              </View>
              <View style={styles.divider} />
              <Text style={styles.sectionSubLabel}>Quality multiplier</Text>
              <View style={styles.qualityRow}>
                {QUALITY_TIERS.map((tier) => (
                  <View key={tier.label} style={[styles.qualityChip, { backgroundColor: tier.bg }]}>
                    <Text style={styles.qualityChipLabel}>{tier.label}</Text>
                    <Text style={[styles.qualityChipValue, { color: tier.color }]}>{tier.value}</Text>
                  </View>
                ))}
              </View>
            </Card>

            <Card style={{ gap: 11 }}>
              <Text style={styles.sectionSubLabel}>Quality reminders</Text>
              <Pressable
                style={styles.confirmChip}
                onPress={() => setQualityConfirmed((v) => !v)}
              >
                <View style={[styles.checkbox, qualityConfirmed && styles.checkboxChecked]}>
                  {qualityConfirmed && <CheckIcon width={14} height={14} />}
                </View>
                <Text style={styles.confirmChipText}>I confirm my plastics meet quality requirements</Text>
              </Pressable>
            </Card>

            {stepError && <Text style={styles.errorText}>{stepError}</Text>}

            <View style={styles.rowGap}>
              <Pressable style={styles.secondaryButton} onPress={goBack}>
                <BackButtonChevron width={6} height={12} />
                <Text style={styles.secondaryButtonText}>Back</Text>
              </Pressable>
              <Pressable style={styles.primaryButton} onPress={handleNextFromStep2}>
                <Text style={styles.primaryButtonText}>Next</Text>
                <NextChevron width={6} height={12} style={{ transform: [{ rotate: "180deg" }] }} />
              </Pressable>
            </View>
          </>
        )}

        {step === 3 && selectedDate && (
          <>
            <Card style={{ gap: 14 }}>
              <View style={{ gap: 6 }}>
                <SectionLabel icon={PreviewIcon}>Review your request</SectionLabel>
                <Text style={styles.hintTextCenter}>Confirming submits this pickup — please double-check the details.</Text>
              </View>

              <View style={styles.pointsPill}>
                <Text style={styles.pointsPillText}>+{estimatedPoints} points estimated</Text>
              </View>

              <Text style={styles.pickupDetailsTitle}>Pickup details</Text>

              <View style={styles.reviewGrid}>
                <View style={styles.reviewCell}>
                  <Text style={styles.reviewLabel}>Date</Text>
                  <Text style={styles.reviewValue}>
                    {selectedDate.weekdayLabel}, {selectedDate.dayOfMonth}
                  </Text>
                </View>
                <View style={styles.reviewCell}>
                  <Text style={styles.reviewLabel}>Zone</Text>
                  <Text style={styles.reviewValue}>{zone.name}</Text>
                </View>
              </View>
              <View style={styles.reviewGrid}>
                <View style={styles.reviewCell}>
                  <Text style={styles.reviewLabel}>Address</Text>
                  <Text style={styles.reviewValue}>{addressText.trim()}</Text>
                </View>
                <View style={styles.reviewCell}>
                  <Text style={styles.reviewLabel}>Sacks</Text>
                  <Text style={styles.reviewValue}>
                    {sackCount} · ~{estimatedKg}kg
                  </Text>
                </View>
              </View>
              {notes.trim() ? (
                <View style={styles.reviewCellFull}>
                  <Text style={styles.reviewLabel}>Notes</Text>
                  <Text style={styles.reviewValue}>{notes.trim()}</Text>
                </View>
              ) : null}
            </Card>

            <View style={{ gap: 14 }}>
              <View style={styles.noticeBox}>
                <AlertIcon width={14} height={14} />
                <Text style={styles.noticeText}>
                  Points will be awarded after your agent verifies the weight and quality of your plastics.
                </Text>
              </View>
              <View style={styles.noticeBox}>
                <AlertIcon width={14} height={14} />
                <Text style={styles.noticeText}>
                  By confirming, an agent will be assigned for this pickup and you will be notified once they are on
                  their way.
                </Text>
              </View>
            </View>

            {submitError && <Text style={styles.errorText}>{submitError}</Text>}

            <View style={styles.rowGap}>
              <Pressable style={styles.secondaryButton} onPress={goBack} disabled={isSubmitting}>
                <EditIcon width={19} height={19} />
                <Text style={styles.secondaryButtonText}>Edit</Text>
              </Pressable>
              <Pressable style={styles.primaryButton} onPress={handleConfirm} disabled={isSubmitting}>
                {isSubmitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <CheckmarkVector width={14} height={11} />
                    <Text style={styles.primaryButtonText}>Confirm Request</Text>
                  </>
                )}
              </Pressable>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const WEEKDAY_NAMES: Record<number, string> = {
  1: "Monday",
  2: "Tuesday",
  3: "Wednesday",
  4: "Thursday",
  5: "Friday",
  6: "Saturday",
  7: "Sunday",
};

const GREEN = "#3ea35f";

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#fafafa" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: "#272727" },
  emptySubtitle: { fontSize: 14, color: "#868686", textAlign: "center" },
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
  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  rowStart: { flexDirection: "row", alignItems: "center", gap: 6 },
  rowGap: { flexDirection: "row", gap: 10 },
  value: { fontSize: 14, fontWeight: "600", color: "#272727" },
  editChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(110,255,158,0.1)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 26,
  },
  editChipText: { fontSize: 12, color: GREEN, fontWeight: "600" },
  pillRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#fafafa",
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  pillText: { fontSize: 10, color: "#868686", fontWeight: "600" },
  pillTextSmall: { fontSize: 8, color: "#868686", fontWeight: "600", flexShrink: 1 },
  addressInput: {
    backgroundColor: "#fafafa",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 14,
    color: "#272727",
    minHeight: 44,
  },
  linkText: { fontSize: 10, color: GREEN, fontWeight: "600" },
  hintText: { fontSize: 10, color: "#868686" },
  hintTextCenter: { fontSize: 10, color: "#515050", textAlign: "center" },
  smallCaps: { fontSize: 8, color: "#868686", fontWeight: "600", textTransform: "uppercase" },
  dateChip: {
    width: 56,
    height: 60,
    borderRadius: 10,
    backgroundColor: "#fafafa",
    alignItems: "center",
    justifyContent: "center",
  },
  dateChipSelected: { backgroundColor: GREEN },
  dateChipWeekday: { fontSize: 10, color: "#818288", textTransform: "uppercase" },
  dateChipDay: { fontSize: 20, color: "#5a5555" },
  dateChipTextSelected: { color: "#fff" },
  notesInput: {
    backgroundColor: "#fafafa",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 12,
    color: "#272727",
    minHeight: 73,
    textAlignVertical: "top",
  },
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
  primaryButton: {
    flex: 1,
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: GREEN,
    borderRadius: 30,
    paddingVertical: 12,
  },
  primaryButtonText: { color: "#fff", fontSize: 14, fontWeight: "600" },
  secondaryButton: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f2f2f2",
    borderRadius: 30,
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  secondaryButtonText: { color: "#515050", fontSize: 14, fontWeight: "600" },
  materialRow: { flexDirection: "row", gap: 10, backgroundColor: "#fafafa", borderRadius: 10, padding: 10 },
  materialPhoto: { width: 60, height: 60, borderRadius: 10, backgroundColor: "#fff" },
  materialName: { fontSize: 13, color: "#272727" },
  materialRate: { fontSize: 10, color: "#868686" },
  materialDescription: { fontSize: 10, color: "#515050" },
  stepperRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 21 },
  stepperButton: { width: 50, height: 50, alignItems: "center", justifyContent: "center" },
  stepperValue: { fontSize: 44, color: "#272727", minWidth: 44, textAlign: "center" },
  divider: { height: 1, backgroundColor: "#e9e9e9" },
  sectionSubLabel: { fontSize: 10, color: "#868686", fontWeight: "600", textTransform: "uppercase" },
  qualityRow: { flexDirection: "row", gap: 12 },
  qualityChip: { flex: 1, borderRadius: 10, padding: 10, gap: 10 },
  qualityChipLabel: { fontSize: 8, color: "#868686", fontWeight: "600", textTransform: "uppercase" },
  qualityChipValue: { fontSize: 24, fontWeight: "500" },
  confirmChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: GREEN,
    backgroundColor: "rgba(110,255,158,0.1)",
    borderRadius: 14,
    padding: 16,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: GREEN,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxChecked: { backgroundColor: GREEN },
  confirmChipText: { fontSize: 12, color: "#272727", flex: 1 },
  pointsPill: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(110,255,158,0.1)",
    borderRadius: 24,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  pointsPillText: { fontSize: 12, color: GREEN, fontWeight: "600" },
  pickupDetailsTitle: { fontSize: 14, color: "#000" },
  reviewGrid: { flexDirection: "row", gap: 9 },
  reviewCell: { flex: 1, backgroundColor: "#fafafa", borderRadius: 10, padding: 10, gap: 4 },
  reviewCellFull: { backgroundColor: "#fafafa", borderRadius: 10, padding: 10, gap: 4 },
  reviewLabel: { fontSize: 8, color: "#868686", fontWeight: "600", textTransform: "uppercase" },
  reviewValue: { fontSize: 14, color: "#272727" },
  noticeBox: {
    flexDirection: "row",
    gap: 6,
    alignItems: "flex-start",
    backgroundColor: "rgba(255,200,137,0.1)",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  noticeText: { flex: 1, fontSize: 12, color: "#f80" },
});
