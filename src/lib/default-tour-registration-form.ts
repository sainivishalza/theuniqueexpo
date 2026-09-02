import type { CustomFormField } from "@/lib/custom-registration-form";

// Every new tour starts with this travel-planning questionnaire as its
// registration form (admin can edit/remove/reorder questions per tour via
// the registration-form builder, same as exhibitions' custom form).
export const DEFAULT_TOUR_REGISTRATION_FIELDS: CustomFormField[] = [
  { id: "f_adults", label: "How many adults are traveling?", type: "text", required: true },
  { id: "f_children", label: "How many children are traveling? (please note their ages)", type: "text", required: false },
  { id: "f_seniors", label: "How many seniors are traveling?", type: "text", required: false },
  { id: "f_special_needs", label: "Any special needs? (diet, allergies, health restrictions, stroller, etc.)", type: "textarea", required: false },

  { id: "f_trip_priority", label: "What matters most to you on this trip? (choose up to 3)", type: "checkbox", required: true,
    options: ["Culture", "Nature", "Food", "Shopping", "Relaxation", "Business"] },
  { id: "f_trip_style", label: "Do you want the classic sights or something more unusual?", type: "radio", required: true,
    options: ["Classic must-see spots", "Off the beaten path", "A mix of both"] },
  { id: "f_must_see", label: "Any cities or attractions you definitely want to visit?", type: "textarea", required: false },

  { id: "f_travel_dates", label: "Planned travel dates (month or season)", type: "text", required: true },
  { id: "f_trip_length", label: "How many days are you willing to travel (excluding flights)?", type: "text", required: false },
  { id: "f_return_deadline", label: "Any fixed return date?", type: "text", required: false },

  { id: "f_budget", label: "Approximate budget per person (excluding airfare)", type: "text", required: true },
  { id: "f_hotel_class", label: "Preferred hotel class", type: "radio", required: true,
    options: ["Hostel / budget", "2-3 star", "4-5 star luxury"] },
  { id: "f_splurge", label: "Willing to pay extra for a unique experience? (helicopter, private guide, individual transfer)", type: "radio", required: false,
    options: ["Yes", "No", "Maybe — tell me more"] },

  { id: "f_interests", label: "Your top interests (choose 2-3)", type: "checkbox", required: true,
    options: ["History & culture", "Nature & mountains", "Modern megacities", "Food & gastronomy", "Shopping", "Relaxation (tea ceremony, spa, hot springs)", "Photography / Instagram spots", "Children's entertainment"] },

  { id: "f_transport_comfort", label: "Preferred transport comfort level", type: "radio", required: false,
    options: ["High-speed train", "Flights", "Private driver", "Economy / budget"] },
  { id: "f_long_journeys", label: "Are you OK with long journeys (5+ hours), or do you want to minimize travel time?", type: "radio", required: false,
    options: ["Fine with long journeys", "Prefer to minimize travel time"] },

  { id: "f_avoid", label: "Anything you absolutely do NOT want to see or do?", type: "textarea", required: false },
  { id: "f_dream", label: "Any dream experiences you want to fulfill? (pet a panda, bamboo raft, view the city from above, etc.)", type: "textarea", required: false },
  { id: "f_free_time", label: "Fully organized tour, or free days for independent exploration?", type: "radio", required: false,
    options: ["Fully organized", "Free days included", "A mix of both"] },

  { id: "f_guide", label: "Do you need an English-speaking guide for the entire tour or just certain days?", type: "radio", required: false,
    options: ["Entire tour", "Certain days only", "Not needed"] },
  { id: "f_airport_transfer", label: "Do you need airport transfer assistance?", type: "radio", required: false,
    options: ["Yes", "No"] },
  { id: "f_extra_services", label: "Do you need help with visas, tickets, or insurance?", type: "checkbox", required: false,
    options: ["Visa assistance", "Flight tickets", "Travel insurance", "None needed"] },

  { id: "f_phone", label: "Phone Number", type: "text", required: true },
];
