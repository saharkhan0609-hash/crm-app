import { connectToDatabase } from "@/lib/mongodb";
import User from "@/models/User";
import bcrypt from "bcryptjs";

export async function POST(request: Request) {
  try {
    const { name, email, password } = await request.json();

    if (!name || !email || !password) {
      return Response.json({ error: "All fields are required" }, { status: 400 });
    }

    if (password.length < 8) {
      return Response.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return Response.json(
        { error: "An account with this email already exists" },
        { status: 400 }
      );
    }

    const hashed = await bcrypt.hash(password, 12);
    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: hashed,
    });

    return Response.json(
      { id: user._id.toString(), name: user.name, email: user.email },
      { status: 201 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}
