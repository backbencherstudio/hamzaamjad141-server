import { Response } from 'express';
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const createPromoCode = async (req: any, res: Response) => {
//   const { code} = req.body; 
//   if (code ) {
//      res.status(400).json({ success: false, message: 'Promo code and user ID are required.' });
//      return
//   }

//   try {
//     const user = await prisma.user.findUnique({
//       where: { id: userId },
//     });

//     if (!user) {
//        res.status(404).json({ success: false, message: 'User not found' });
//        return
//     }
//     const newPromoCode = await prisma.promoCode.create({
//       data: {
//         code,
//         status: 'Active', 
//         userId,
//         userName: user.name, 
//         email: user.email,   
//       },
//     });

//      res.status(201).json({ success: true, message: 'Promo code created successfully', promoCode: newPromoCode });
//      return
//   } catch (err) {
//     console.error('Error creating promo code:', err);
//      res.status(500).json({ success: false, message: 'Failed to create promo code', error: err.message });
//      return
//   }
};

export const redeemPromoCode = async (req: any, res: Response) => {
  const { promoCode } = req.body; 
  if (!promoCode) {
     res.status(400).json({ success: false, message: 'Promo code is required.' });
     return
  }

  try {
    const existingPromoCode = await prisma.promoCode.findUnique({
      where: { code: promoCode },
    });

    if (!existingPromoCode) {
       res.status(404).json({ success: false, message: 'Promo code not found' });
       return
    }

    if (existingPromoCode.status === 'Used') {
       res.status(400).json({ success: false, message: 'This promo code has already been used' });
       return
    }
    const updatedPromoCode = await prisma.promoCode.update({
      where: { code: promoCode },
      data: {
        status: 'Used',
      },
    });

     res.status(200).json({ success: true, message: 'Promo code redeemed successfully', promoCode: updatedPromoCode });
     return
  } catch (err) {
    console.error('Error redeeming promo code:', err);
     res.status(500).json({ success: false, message: 'Failed to redeem promo code', error: err.message });
     return
  }
};
