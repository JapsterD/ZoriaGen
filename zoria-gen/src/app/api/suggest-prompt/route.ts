import { NextResponse } from "next/server";

const SUGGESTIONS = [
  "dancing gracefully in the rain with a joyful expression",
  "walking through a neon-lit cyberpunk city at night",
  "performing martial arts moves in slow motion",
  "sitting at a café and sipping coffee while reading a book",
  "running through a field of wildflowers at sunset",
  "playing guitar on a rooftop overlooking the city skyline",
  "walking dramatically in slow motion with wind blowing",
  "cooking an elaborate meal in a modern kitchen",
  "meditating peacefully in a zen garden with falling cherry blossoms",
  "skateboarding through an empty parking garage",
  "painting on a canvas in a sunlit art studio",
  "exploring a mysterious ancient temple with a flashlight",
  "laughing and spinning around with autumn leaves falling",
  "doing a dramatic superhero landing pose",
  "surfing a giant wave in crystal clear ocean water",
];

export async function POST() {
  const randomPrompt =
    SUGGESTIONS[Math.floor(Math.random() * SUGGESTIONS.length)];

  return NextResponse.json({ prompt: randomPrompt });
}
