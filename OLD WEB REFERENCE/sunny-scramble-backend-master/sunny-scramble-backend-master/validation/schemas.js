const { z } = require('zod');

const registerSchema = z.object({
  fullName: z.string().min(2, "Full name is required"),
  email: z.string().min(3, "Invalid email or username"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(['superadmin', 'admin', 'staff', 'owner']).optional()
});

const loginSchema = z.object({
  email: z.string().min(3, "Invalid email or username"),
  password: z.string().min(1, "Password is required")
});

const productSchema = z.object({
  productName: z.string().min(1, "Product name is required"),
  category: z.string().min(1, "Category is required"),
  quantity: z.number().int().min(0, "Quantity must be positive").default(0),
  unitCost: z.number().min(0, "Unit cost must be positive"),
  sellingPrice: z.number().min(0, "Selling price must be positive")
});

module.exports = {
  registerSchema,
  loginSchema,
  productSchema
};
