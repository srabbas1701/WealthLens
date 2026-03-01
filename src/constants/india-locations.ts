/**
 * India Locations: States, Cities, and Pincode Prefix Validation
 *
 * Used by the real estate module to:
 * - Populate state dropdown
 * - Filter city suggestions by state (datalist)
 * - Soft-validate pincode against selected state (first 2 digits)
 */

// All Indian states and Union Territories (alphabetical)
export const INDIA_STATES: string[] = [
  'Andaman and Nicobar Islands',
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chandigarh',
  'Chhattisgarh',
  'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jammu and Kashmir',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Ladakh',
  'Lakshadweep',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Puducherry',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
];

// Major cities grouped by state — used for datalist suggestions
export const CITIES_BY_STATE: Record<string, string[]> = {
  'Andaman and Nicobar Islands': ['Port Blair'],
  'Andhra Pradesh': [
    'Visakhapatnam', 'Vijayawada', 'Guntur', 'Tirupati', 'Nellore',
    'Kurnool', 'Rajahmundry', 'Kakinada', 'Kadapa', 'Eluru',
  ],
  'Arunachal Pradesh': ['Itanagar', 'Naharlagun', 'Tawang'],
  'Assam': ['Guwahati', 'Silchar', 'Dibrugarh', 'Jorhat', 'Nagaon', 'Tezpur'],
  'Bihar': ['Patna', 'Gaya', 'Muzaffarpur', 'Bhagalpur', 'Darbhanga', 'Purnia', 'Munger'],
  'Chandigarh': ['Chandigarh'],
  'Chhattisgarh': ['Raipur', 'Bhilai', 'Bilaspur', 'Durg', 'Korba', 'Rajnandgaon'],
  'Dadra and Nagar Haveli and Daman and Diu': ['Silvassa', 'Daman', 'Diu'],
  'Delhi': ['New Delhi', 'Delhi', 'Dwarka', 'Rohini', 'Janakpuri', 'Laxmi Nagar', 'Saket'],
  'Goa': ['Panaji', 'Margao', 'Vasco da Gama', 'Mapusa', 'Ponda'],
  'Gujarat': [
    'Ahmedabad', 'Surat', 'Vadodara', 'Rajkot', 'Bhavnagar', 'Jamnagar',
    'Gandhinagar', 'Junagadh', 'Anand', 'Navsari', 'Morbi', 'Nadiad',
  ],
  'Haryana': [
    'Gurugram', 'Faridabad', 'Panipat', 'Ambala', 'Yamunanagar',
    'Rohtak', 'Hisar', 'Karnal', 'Sonipat', 'Panchkula',
  ],
  'Himachal Pradesh': ['Shimla', 'Manali', 'Dharamshala', 'Solan', 'Mandi', 'Kullu', 'Baddi'],
  'Jammu and Kashmir': ['Srinagar', 'Jammu', 'Anantnag', 'Baramulla', 'Sopore'],
  'Jharkhand': ['Ranchi', 'Jamshedpur', 'Dhanbad', 'Bokaro', 'Deoghar', 'Hazaribagh', 'Giridih'],
  'Karnataka': [
    'Bengaluru', 'Mysuru', 'Mangaluru', 'Hubli', 'Belagavi', 'Davangere',
    'Ballari', 'Vijayapura', 'Shivamogga', 'Tumkur', 'Kalaburagi', 'Hassan',
  ],
  'Kerala': [
    'Thiruvananthapuram', 'Kochi', 'Kozhikode', 'Thrissur', 'Kollam',
    'Kannur', 'Alappuzha', 'Palakkad', 'Malappuram', 'Kottayam',
  ],
  'Ladakh': ['Leh', 'Kargil'],
  'Lakshadweep': ['Kavaratti'],
  'Madhya Pradesh': [
    'Bhopal', 'Indore', 'Jabalpur', 'Gwalior', 'Ujjain', 'Sagar',
    'Ratlam', 'Satna', 'Dewas', 'Rewa',
  ],
  'Maharashtra': [
    'Mumbai', 'Pune', 'Nagpur', 'Thane', 'Nashik', 'Aurangabad',
    'Solapur', 'Navi Mumbai', 'Vasai-Virar', 'Kolhapur', 'Amravati',
    'Sangli', 'Latur', 'Dhule', 'Akola',
  ],
  'Manipur': ['Imphal', 'Thoubal', 'Bishnupur'],
  'Meghalaya': ['Shillong', 'Tura'],
  'Mizoram': ['Aizawl', 'Lunglei'],
  'Nagaland': ['Kohima', 'Dimapur'],
  'Odisha': ['Bhubaneswar', 'Cuttack', 'Berhampur', 'Rourkela', 'Sambalpur', 'Puri', 'Balasore'],
  'Puducherry': ['Puducherry', 'Karaikal', 'Mahe'],
  'Punjab': ['Ludhiana', 'Amritsar', 'Jalandhar', 'Patiala', 'Bathinda', 'Mohali', 'Hoshiarpur'],
  'Rajasthan': [
    'Jaipur', 'Jodhpur', 'Udaipur', 'Kota', 'Ajmer', 'Bikaner',
    'Alwar', 'Bhilwara', 'Sri Ganganagar', 'Sikar',
  ],
  'Sikkim': ['Gangtok', 'Namchi', 'Gyalshing'],
  'Tamil Nadu': [
    'Chennai', 'Coimbatore', 'Madurai', 'Salem', 'Tiruchirappalli',
    'Tiruppur', 'Erode', 'Vellore', 'Thoothukudi', 'Dindigul', 'Thanjavur',
  ],
  'Telangana': [
    'Hyderabad', 'Warangal', 'Nizamabad', 'Karimnagar', 'Khammam',
    'Secunderabad', 'Mahbubnagar', 'Nalgonda',
  ],
  'Tripura': ['Agartala', 'Udaipur', 'Dharmanagar'],
  'Uttar Pradesh': [
    'Lucknow', 'Kanpur', 'Agra', 'Varanasi', 'Prayagraj', 'Meerut',
    'Noida', 'Greater Noida', 'Ghaziabad', 'Mathura', 'Bareilly',
    'Aligarh', 'Gorakhpur', 'Moradabad', 'Saharanpur',
  ],
  'Uttarakhand': ['Dehradun', 'Haridwar', 'Roorkee', 'Haldwani', 'Rishikesh', 'Nainital', 'Mussoorie'],
  'West Bengal': ['Kolkata', 'Howrah', 'Durgapur', 'Siliguri', 'Asansol', 'Darjeeling', 'Bardhaman'],
};

/**
 * First 2 digits of pincode valid for each state.
 * Used for soft validation — mismatch shows a warning, not a hard error.
 *
 * Note: Some prefixes overlap between neighboring states (e.g., Jharkhand/Bihar).
 * This is expected — treat mismatches as warnings only.
 */
export const PINCODE_PREFIXES_BY_STATE: Record<string, number[]> = {
  'Delhi': [11],
  'Haryana': [12, 13],
  'Punjab': [14, 15],
  'Chandigarh': [16],
  'Himachal Pradesh': [17],
  'Jammu and Kashmir': [18, 19],
  'Ladakh': [19],
  'Uttar Pradesh': [20, 21, 22, 23, 24, 25, 26, 27, 28],
  'Uttarakhand': [24, 26, 27],
  'Rajasthan': [30, 31, 32, 33, 34],
  'Gujarat': [36, 37, 38, 39],
  'Dadra and Nagar Haveli and Daman and Diu': [39],
  'Maharashtra': [40, 41, 42, 43, 44],
  'Goa': [40],
  'Madhya Pradesh': [45, 46, 47, 48],
  'Chhattisgarh': [49],
  'Telangana': [50],
  'Andhra Pradesh': [51, 52, 53],
  'Karnataka': [56, 57, 58, 59],
  'Tamil Nadu': [60, 61, 62, 63, 64],
  'Puducherry': [60, 67],
  'Kerala': [67, 68, 69],
  'Lakshadweep': [68],
  'West Bengal': [70, 71, 72, 73],
  'Sikkim': [73],
  'Andaman and Nicobar Islands': [74],
  'Odisha': [75, 76, 77],
  'Assam': [78],
  'Arunachal Pradesh': [79],
  'Nagaland': [79],
  'Manipur': [79],
  'Mizoram': [79],
  'Tripura': [79],
  'Meghalaya': [79],
  'Bihar': [80, 81, 82, 83, 84, 85],
  'Jharkhand': [81, 82, 83, 84],
};

/**
 * Returns cities for a given state (for datalist suggestions).
 * Returns empty array if state not found.
 */
export function getCitiesForState(state: string): string[] {
  return CITIES_BY_STATE[state] ?? [];
}

/**
 * Checks if a 6-digit pincode's first 2 digits match the expected state range.
 * Returns true if valid or if state has no known prefixes.
 * Returns false only when there's a clear mismatch — treat as a soft warning.
 */
export function isPincodeValidForState(pincode: string, state: string): boolean {
  const prefixes = PINCODE_PREFIXES_BY_STATE[state];
  if (!prefixes || prefixes.length === 0) return true; // Unknown state — skip
  if (!/^\d{6}$/.test(pincode)) return true; // Not a 6-digit pincode — let format check handle it
  const prefix = parseInt(pincode.substring(0, 2), 10);
  return prefixes.includes(prefix);
}
