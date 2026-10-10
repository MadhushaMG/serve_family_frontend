/* eslint-disable import/no-named-as-default */
import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  FlatList,
  Modal,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import useTheme from "../constants/theme";
import { SafeAreaView } from "react-native-safe-area-context";

export type Country = {
  code: string;   // "+94"
  iso: string;    // "LK"
  name: string;   // "Sri Lanka"
  flag: string;   // "🇱🇰"
};

export const COUNTRIES: Country[] = [
  { code: "+93",  iso: "AF", name: "Afghanistan",          flag: "🇦🇫" },
  { code: "+355", iso: "AL", name: "Albania",               flag: "🇦🇱" },
  { code: "+213", iso: "DZ", name: "Algeria",               flag: "🇩🇿" },
  { code: "+376", iso: "AD", name: "Andorra",               flag: "🇦🇩" },
  { code: "+244", iso: "AO", name: "Angola",                flag: "🇦🇴" },
  { code: "+54",  iso: "AR", name: "Argentina",             flag: "🇦🇷" },
  { code: "+374", iso: "AM", name: "Armenia",               flag: "🇦🇲" },
  { code: "+61",  iso: "AU", name: "Australia",             flag: "🇦🇺" },
  { code: "+43",  iso: "AT", name: "Austria",               flag: "🇦🇹" },
  { code: "+994", iso: "AZ", name: "Azerbaijan",            flag: "🇦🇿" },
  { code: "+973", iso: "BH", name: "Bahrain",               flag: "🇧🇭" },
  { code: "+880", iso: "BD", name: "Bangladesh",            flag: "🇧🇩" },
  { code: "+32",  iso: "BE", name: "Belgium",               flag: "🇧🇪" },
  { code: "+501", iso: "BZ", name: "Belize",                flag: "🇧🇿" },
  { code: "+229", iso: "BJ", name: "Benin",                 flag: "🇧🇯" },
  { code: "+975", iso: "BT", name: "Bhutan",                flag: "🇧🇹" },
  { code: "+591", iso: "BO", name: "Bolivia",               flag: "🇧🇴" },
  { code: "+387", iso: "BA", name: "Bosnia & Herzegovina",  flag: "🇧🇦" },
  { code: "+55",  iso: "BR", name: "Brazil",                flag: "🇧🇷" },
  { code: "+673", iso: "BN", name: "Brunei",                flag: "🇧🇳" },
  { code: "+359", iso: "BG", name: "Bulgaria",              flag: "🇧🇬" },
  { code: "+226", iso: "BF", name: "Burkina Faso",          flag: "🇧🇫" },
  { code: "+855", iso: "KH", name: "Cambodia",              flag: "🇰🇭" },
  { code: "+237", iso: "CM", name: "Cameroon",              flag: "🇨🇲" },
  { code: "+1",   iso: "CA", name: "Canada",                flag: "🇨🇦" },
  { code: "+236", iso: "CF", name: "Central African Rep.",  flag: "🇨🇫" },
  { code: "+56",  iso: "CL", name: "Chile",                 flag: "🇨🇱" },
  { code: "+86",  iso: "CN", name: "China",                 flag: "🇨🇳" },
  { code: "+57",  iso: "CO", name: "Colombia",              flag: "🇨🇴" },
  { code: "+242", iso: "CG", name: "Congo",                 flag: "🇨🇬" },
  { code: "+506", iso: "CR", name: "Costa Rica",            flag: "🇨🇷" },
  { code: "+385", iso: "HR", name: "Croatia",               flag: "🇭🇷" },
  { code: "+53",  iso: "CU", name: "Cuba",                  flag: "🇨🇺" },
  { code: "+357", iso: "CY", name: "Cyprus",                flag: "🇨🇾" },
  { code: "+420", iso: "CZ", name: "Czech Republic",        flag: "🇨🇿" },
  { code: "+45",  iso: "DK", name: "Denmark",               flag: "🇩🇰" },
  { code: "+593", iso: "EC", name: "Ecuador",               flag: "🇪🇨" },
  { code: "+20",  iso: "EG", name: "Egypt",                 flag: "🇪🇬" },
  { code: "+503", iso: "SV", name: "El Salvador",           flag: "🇸🇻" },
  { code: "+251", iso: "ET", name: "Ethiopia",              flag: "🇪🇹" },
  { code: "+679", iso: "FJ", name: "Fiji",                  flag: "🇫🇯" },
  { code: "+358", iso: "FI", name: "Finland",               flag: "🇫🇮" },
  { code: "+33",  iso: "FR", name: "France",                flag: "🇫🇷" },
  { code: "+241", iso: "GA", name: "Gabon",                 flag: "🇬🇦" },
  { code: "+220", iso: "GM", name: "Gambia",                flag: "🇬🇲" },
  { code: "+995", iso: "GE", name: "Georgia",               flag: "🇬🇪" },
  { code: "+49",  iso: "DE", name: "Germany",               flag: "🇩🇪" },
  { code: "+233", iso: "GH", name: "Ghana",                 flag: "🇬🇭" },
  { code: "+30",  iso: "GR", name: "Greece",                flag: "🇬🇷" },
  { code: "+502", iso: "GT", name: "Guatemala",             flag: "🇬🇹" },
  { code: "+224", iso: "GN", name: "Guinea",                flag: "🇬🇳" },
  { code: "+509", iso: "HT", name: "Haiti",                 flag: "🇭🇹" },
  { code: "+504", iso: "HN", name: "Honduras",              flag: "🇭🇳" },
  { code: "+852", iso: "HK", name: "Hong Kong",             flag: "🇭🇰" },
  { code: "+36",  iso: "HU", name: "Hungary",               flag: "🇭🇺" },
  { code: "+354", iso: "IS", name: "Iceland",               flag: "🇮🇸" },
  { code: "+91",  iso: "IN", name: "India",                 flag: "🇮🇳" },
  { code: "+62",  iso: "ID", name: "Indonesia",             flag: "🇮🇩" },
  { code: "+98",  iso: "IR", name: "Iran",                  flag: "🇮🇷" },
  { code: "+964", iso: "IQ", name: "Iraq",                  flag: "🇮🇶" },
  { code: "+353", iso: "IE", name: "Ireland",               flag: "🇮🇪" },
  { code: "+972", iso: "IL", name: "Israel",                flag: "🇮🇱" },
  { code: "+39",  iso: "IT", name: "Italy",                 flag: "🇮🇹" },
  { code: "+81",  iso: "JP", name: "Japan",                 flag: "🇯🇵" },
  { code: "+962", iso: "JO", name: "Jordan",                flag: "🇯🇴" },
  { code: "+7",   iso: "KZ", name: "Kazakhstan",            flag: "🇰🇿" },
  { code: "+254", iso: "KE", name: "Kenya",                 flag: "🇰🇪" },
  { code: "+965", iso: "KW", name: "Kuwait",                flag: "🇰🇼" },
  { code: "+996", iso: "KG", name: "Kyrgyzstan",            flag: "🇰🇬" },
  { code: "+856", iso: "LA", name: "Laos",                  flag: "🇱🇦" },
  { code: "+371", iso: "LV", name: "Latvia",                flag: "🇱🇻" },
  { code: "+961", iso: "LB", name: "Lebanon",               flag: "🇱🇧" },
  { code: "+266", iso: "LS", name: "Lesotho",               flag: "🇱🇸" },
  { code: "+231", iso: "LR", name: "Liberia",               flag: "🇱🇷" },
  { code: "+218", iso: "LY", name: "Libya",                 flag: "🇱🇾" },
  { code: "+423", iso: "LI", name: "Liechtenstein",         flag: "🇱🇮" },
  { code: "+370", iso: "LT", name: "Lithuania",             flag: "🇱🇹" },
  { code: "+352", iso: "LU", name: "Luxembourg",            flag: "🇱🇺" },
  { code: "+853", iso: "MO", name: "Macau",                 flag: "🇲🇴" },
  { code: "+389", iso: "MK", name: "Macedonia",             flag: "🇲🇰" },
  { code: "+261", iso: "MG", name: "Madagascar",            flag: "🇲🇬" },
  { code: "+265", iso: "MW", name: "Malawi",                flag: "🇲🇼" },
  { code: "+60",  iso: "MY", name: "Malaysia",              flag: "🇲🇾" },
  { code: "+960", iso: "MV", name: "Maldives",              flag: "🇲🇻" },
  { code: "+223", iso: "ML", name: "Mali",                  flag: "🇲🇱" },
  { code: "+356", iso: "MT", name: "Malta",                 flag: "🇲🇹" },
  { code: "+222", iso: "MR", name: "Mauritania",            flag: "🇲🇷" },
  { code: "+230", iso: "MU", name: "Mauritius",             flag: "🇲🇺" },
  { code: "+52",  iso: "MX", name: "Mexico",                flag: "🇲🇽" },
  { code: "+373", iso: "MD", name: "Moldova",               flag: "🇲🇩" },
  { code: "+976", iso: "MN", name: "Mongolia",              flag: "🇲🇳" },
  { code: "+212", iso: "MA", name: "Morocco",               flag: "🇲🇦" },
  { code: "+258", iso: "MZ", name: "Mozambique",            flag: "🇲🇿" },
  { code: "+95",  iso: "MM", name: "Myanmar",               flag: "🇲🇲" },
  { code: "+264", iso: "NA", name: "Namibia",               flag: "🇳🇦" },
  { code: "+977", iso: "NP", name: "Nepal",                 flag: "🇳🇵" },
  { code: "+31",  iso: "NL", name: "Netherlands",           flag: "🇳🇱" },
  { code: "+64",  iso: "NZ", name: "New Zealand",           flag: "🇳🇿" },
  { code: "+505", iso: "NI", name: "Nicaragua",             flag: "🇳🇮" },
  { code: "+227", iso: "NE", name: "Niger",                 flag: "🇳🇪" },
  { code: "+234", iso: "NG", name: "Nigeria",               flag: "🇳🇬" },
  { code: "+47",  iso: "NO", name: "Norway",                flag: "🇳🇴" },
  { code: "+968", iso: "OM", name: "Oman",                  flag: "🇴🇲" },
  { code: "+92",  iso: "PK", name: "Pakistan",              flag: "🇵🇰" },
  { code: "+507", iso: "PA", name: "Panama",                flag: "🇵🇦" },
  { code: "+675", iso: "PG", name: "Papua New Guinea",      flag: "🇵🇬" },
  { code: "+595", iso: "PY", name: "Paraguay",              flag: "🇵🇾" },
  { code: "+51",  iso: "PE", name: "Peru",                  flag: "🇵🇪" },
  { code: "+63",  iso: "PH", name: "Philippines",           flag: "🇵🇭" },
  { code: "+48",  iso: "PL", name: "Poland",                flag: "🇵🇱" },
  { code: "+351", iso: "PT", name: "Portugal",              flag: "🇵🇹" },
  { code: "+974", iso: "QA", name: "Qatar",                 flag: "🇶🇦" },
  { code: "+40",  iso: "RO", name: "Romania",               flag: "🇷🇴" },
  { code: "+7",   iso: "RU", name: "Russia",                flag: "🇷🇺" },
  { code: "+250", iso: "RW", name: "Rwanda",                flag: "🇷🇼" },
  { code: "+966", iso: "SA", name: "Saudi Arabia",          flag: "🇸🇦" },
  { code: "+221", iso: "SN", name: "Senegal",               flag: "🇸🇳" },
  { code: "+381", iso: "RS", name: "Serbia",                flag: "🇷🇸" },
  { code: "+232", iso: "SL", name: "Sierra Leone",          flag: "🇸🇱" },
  { code: "+65",  iso: "SG", name: "Singapore",             flag: "🇸🇬" },
  { code: "+421", iso: "SK", name: "Slovakia",              flag: "🇸🇰" },
  { code: "+386", iso: "SI", name: "Slovenia",              flag: "🇸🇮" },
  { code: "+252", iso: "SO", name: "Somalia",               flag: "🇸🇴" },
  { code: "+27",  iso: "ZA", name: "South Africa",          flag: "🇿🇦" },
  { code: "+82",  iso: "KR", name: "South Korea",           flag: "🇰🇷" },
  { code: "+211", iso: "SS", name: "South Sudan",           flag: "🇸🇸" },
  { code: "+34",  iso: "ES", name: "Spain",                 flag: "🇪🇸" },
  { code: "+94",  iso: "LK", name: "Sri Lanka",             flag: "🇱🇰" },
  { code: "+249", iso: "SD", name: "Sudan",                 flag: "🇸🇩" },
  { code: "+597", iso: "SR", name: "Suriname",              flag: "🇸🇷" },
  { code: "+268", iso: "SZ", name: "Swaziland",             flag: "🇸🇿" },
  { code: "+46",  iso: "SE", name: "Sweden",                flag: "🇸🇪" },
  { code: "+41",  iso: "CH", name: "Switzerland",           flag: "🇨🇭" },
  { code: "+963", iso: "SY", name: "Syria",                 flag: "🇸🇾" },
  { code: "+886", iso: "TW", name: "Taiwan",                flag: "🇹🇼" },
  { code: "+992", iso: "TJ", name: "Tajikistan",            flag: "🇹🇯" },
  { code: "+255", iso: "TZ", name: "Tanzania",              flag: "🇹🇿" },
  { code: "+66",  iso: "TH", name: "Thailand",              flag: "🇹🇭" },
  { code: "+228", iso: "TG", name: "Togo",                  flag: "🇹🇬" },
  { code: "+216", iso: "TN", name: "Tunisia",               flag: "🇹🇳" },
  { code: "+90",  iso: "TR", name: "Turkey",                flag: "🇹🇷" },
  { code: "+993", iso: "TM", name: "Turkmenistan",          flag: "🇹🇲" },
  { code: "+256", iso: "UG", name: "Uganda",                flag: "🇺🇬" },
  { code: "+380", iso: "UA", name: "Ukraine",               flag: "🇺🇦" },
  { code: "+971", iso: "AE", name: "United Arab Emirates",  flag: "🇦🇪" },
  { code: "+44",  iso: "GB", name: "United Kingdom",        flag: "🇬🇧" },
  { code: "+1",   iso: "US", name: "United States",         flag: "🇺🇸" },
  { code: "+598", iso: "UY", name: "Uruguay",               flag: "🇺🇾" },
  { code: "+998", iso: "UZ", name: "Uzbekistan",            flag: "🇺🇿" },
  { code: "+58",  iso: "VE", name: "Venezuela",             flag: "🇻🇪" },
  { code: "+84",  iso: "VN", name: "Vietnam",               flag: "🇻🇳" },
  { code: "+967", iso: "YE", name: "Yemen",                 flag: "🇾🇪" },
  { code: "+260", iso: "ZM", name: "Zambia",                flag: "🇿🇲" },
  { code: "+263", iso: "ZW", name: "Zimbabwe",              flag: "🇿🇼" },
];

type Props = {
  value: Country;
  onChange: (country: Country) => void;
};

export const DEFAULT_COUNTRY = COUNTRIES.find((c) => c.iso === "LK")!;

export default function CountryCodePicker({ value, onChange }: Props) {
  const t = useTheme();
  const c = t.colors;
  const ty = t.typography;

  const [visible, setVisible] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return COUNTRIES;
    return COUNTRIES.filter(
      (cn) =>
        cn.name.toLowerCase().includes(q) ||
        cn.code.includes(q) ||
        cn.iso.toLowerCase().includes(q),
    );
  }, [search]);

  return (
    <>
      {/* Trigger button */}
      <TouchableOpacity
        onPress={() => setVisible(true)}
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 4,
          paddingRight: 8,
          borderRightWidth: 1,
          borderRightColor: c.border,
          marginRight: 8,
        }}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Text style={{ fontSize: 18 }}>{value.flag}</Text>
        <Text
          style={{
            fontSize: ty.size.sm,
            fontWeight: ty.weight.medium,
            color: c.textPrimary,
          }}
        >
          {value.code}
        </Text>
        <MaterialIcons name="arrow-drop-down" size={16} color={c.textTertiary} />
      </TouchableOpacity>

      {/* Modal */}
      <Modal
        visible={visible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setVisible(false)}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: c.backgroundAlt }}>
          {/* Header */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              paddingHorizontal: 16,
              paddingVertical: 12,
              borderBottomWidth: 1,
              borderBottomColor: c.border,
            }}
          >
            <Text
              style={{
                flex: 1,
                fontSize: ty.size.lg,
                fontWeight: ty.weight.bold,
                color: c.textPrimary,
              }}
            >
              Select Country
            </Text>
            <TouchableOpacity
              onPress={() => setVisible(false)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <MaterialIcons name="close" size={22} color={c.textPrimary} />
            </TouchableOpacity>
          </View>

          {/* Search */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              margin: 12,
              paddingHorizontal: 12,
              backgroundColor: c.surface,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: c.border,
              gap: 8,
            }}
          >
            <MaterialIcons name="search" size={18} color={c.textTertiary} />
            <TextInput
              style={{
                flex: 1,
                height: 44,
                fontSize: ty.size.sm,
                color: c.textPrimary,
              }}
              placeholder="Search country or code..."
              placeholderTextColor={c.textTertiary}
              value={search}
              onChangeText={setSearch}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch("")}>
                <MaterialIcons name="cancel" size={16} color={c.textTertiary} />
              </TouchableOpacity>
            )}
          </View>

          {/* List */}
          <FlatList
            data={filtered}
            keyExtractor={(item) => item.iso}
            keyboardShouldPersistTaps="handled"
            ItemSeparatorComponent={() => (
              <View
                style={{ height: 1, backgroundColor: c.border, marginLeft: 56 }}
              />
            )}
            renderItem={({ item }) => {
              const isSelected = item.iso === value.iso;
              return (
                <TouchableOpacity
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                    backgroundColor: isSelected ? c.infoBg : "transparent",
                    gap: 12,
                  }}
                  onPress={() => {
                    onChange(item);
                    setVisible(false);
                    setSearch("");
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={{ fontSize: 24, width: 32, textAlign: "center" }}>
                    {item.flag}
                  </Text>
                  <Text
                    style={{
                      flex: 1,
                      fontSize: ty.size.sm,
                      color: isSelected ? c.primary : c.textPrimary,
                      fontWeight: isSelected
                        ? ty.weight.semibold
                        : ty.weight.regular,
                    }}
                  >
                    {item.name}
                  </Text>
                  <Text
                    style={{
                      fontSize: ty.size.sm,
                      color: isSelected ? c.primary : c.textTertiary,
                      fontWeight: ty.weight.medium,
                    }}
                  >
                    {item.code}
                  </Text>
                  {isSelected && (
                    <MaterialIcons name="check" size={16} color={c.primary} />
                  )}
                </TouchableOpacity>
              );
            }}
          />
        </SafeAreaView>
      </Modal>
    </>
  );
}