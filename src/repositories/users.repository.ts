/* eslint-disable no-return-assign */
/* eslint-disable radix */
import prisma from "../config/prisma";
import Bcrypt from "../utils/Bcrypt";
import { inputCreateUser, inputSubscriptionTransactionObject, inputUpdateUser } from "../utils/InputTypes";
import NumberHelper from "../utils/Numbers";

export default class UsersRepository {
    static getAll() {
        return prisma.user.findMany();
    }

    static getTotal() {
        return prisma.user.count();
    }

    static getById(user_id: string) {
        return prisma.user.findUnique({
            where: {
                id: user_id,
            },
        });
    }

    static verifyIfAdminById(user_id: string) {
        return prisma.user.findUnique({
            where: {
                isAdmin: {
                    id: user_id,
                    admin: true,
                },
            },
        });
    }

    static getUserByEmail(email: string) {
        return prisma.user.findUnique({
            where: {
                email,
            },
        });
    }

    static emailRegistred(email: string) {
        const emailExists = prisma.user.findUnique({
            where: {
                email,
            },
        });

        return !!emailExists;
    }

    static async login(email: string, password: string) {
        const user = await prisma.user.findUnique({
            where: {
                email,
            },
        });

        if (!user) return false;

        return (await Bcrypt.compare(password, user?.password)) ? user : null;
    }

    static async verifyPassword(user_id: string, password: string) {
        const user = await prisma.user.findUnique({
            where: {
                id: user_id,
            },
        });

        return !!(await Bcrypt.compare(password, user?.password as string));
    }

    static async emailIsConfirmed(email: string) {
        const user = await prisma.user.findUnique({
            where: {
                emailConfirmed: {
                    email,
                    confirmed_email: true,
                },
            },
        });

        return !!user;
    }

    static async update(userObject: inputUpdateUser) {
        const User = await prisma.user.findUnique({
            where: {
                id: userObject.id,
            },
        });

        if (User && (await Bcrypt.compare(userObject.older_password, User.password))) {
            await prisma.user.update({
                where: {
                    id: User?.id,
                },
                data: {
                    email: userObject.email ? userObject.email : User.email,
                    password: userObject.new_password ? await Bcrypt.hash(userObject.new_password) : User.password,
                    phone: userObject.phone ? userObject.phone : User.phone,
                    address_zipcode: userObject.address_zipcode,
                    address_street: userObject.address_street,
                    address_street_number: parseInt(userObject.address_street_number),
                    address_neighborhood: userObject.address_neighborhood,
                    address_city: userObject.address_city,
                    address_state: userObject.address_state,
                    address_country: userObject.address_country,
                },
            });

            const user = await prisma.user.findUnique({
                where: {
                    email: userObject.email,
                },
            });

            return !!user;
        }
        return null;
    }

    static async create(userObject: inputCreateUser, confirmEmailToken: string) {
        return prisma.user.create({
            data: {
                name: userObject.username,
                email: userObject.email,
                password: await Bcrypt.hash(userObject.password),
                confirm_email_token: confirmEmailToken,
            },
        });
    }

    static async createStripeCustomer(user_id: string, stripe_customer_id: string) {
        await prisma.user.update({
            where: {
                id: user_id,
            },
            data: {
                stripe_customer_id,
            },
        });
    }

    static async createStripeCard(
        user_id: string,
        customerCard: { card: { id: string; brand: string; exp_month: number; exp_year: number; last4: number } },
        cardNumber: string,
    ) {
        await prisma.user.update({
            where: {
                id: user_id,
            },
            data: {
                stripe_card_id: customerCard.card.id,
                stripe_card_brand: customerCard.card.brand,
                stripe_card_number: cardNumber,
                stripe_card_exp_month: customerCard.card.exp_month,
                stripe_card_exp_year: customerCard.card.exp_year,
                stripe_card_last4: Number(customerCard.card.last4 as number),
            },
        });
    }

    static async createStripeSubscription(
        user_id: string,
        subscriptionTransactionObject: inputSubscriptionTransactionObject,
    ) {
        await prisma.user.update({
            where: {
                id: user_id,
            },
            data: {
                stripe_currently_subscription_id: subscriptionTransactionObject.transaction_id,
                stripe_currently_subscription_name: subscriptionTransactionObject.plan_name,
                stripe_subscription_start: subscriptionTransactionObject.current_period_start,
                stripe_subscription_end: subscriptionTransactionObject.current_period_end,
                stripe_cancel_at_period_end: subscriptionTransactionObject.cancel_at_period_end,
            },
        });
    }

    static async emailExists(email: string) {
        return prisma.user.findUnique({
            where: {
                email,
            },
        });
    }

    static async createResetPasswordToken(email: string, resetPasswordToken: string) {
        await prisma.user.update({
            where: {
                email,
            },
            data: {
                reset_password_token: resetPasswordToken,
            },
        });
    }

    static resetPasswordTokenIsValid(email: string, resetPasswordToken: string) {
        return prisma.user.findUnique({
            where: {
                resetPasswordTokenIsValid: {
                    email,
                    reset_password_token: resetPasswordToken,
                },
            },
        });
    }

    static async resetPassword(email: string, newPassword: string) {
        return prisma.user.update({
            where: {
                email,
            },
            data: {
                password: await Bcrypt.hash(newPassword),
                reset_password_token: null,
            },
        });
    }

    static verifyIfEmailIsConfirmed(email: string) {
        return prisma.user.findUnique({
            where: {
                emailConfirmed: {
                    email,
                    confirmed_email: true,
                },
            },
        });
    }

    static async createConfirmEmailToken(email: string, confirmEmailToken: string) {
        await prisma.user.update({
            where: {
                email,
            },
            data: {
                confirm_email_token: confirmEmailToken,
            },
        });
    }

    static async verifyConfirmEmailToken(email: string, confirmEmailToken: string) {
        if (await this.emailExists(email)) {
            if (
                await prisma.user.findUnique({
                    where: {
                        confirmEmailTokenIsValid: {
                            email,
                            confirm_email_token: confirmEmailToken,
                        },
                    },
                })
            ) {
                return prisma.user.update({
                    where: {
                        email,
                    },
                    data: {
                        confirm_email_token: null,
                        confirmed_email: true,
                    },
                });
            }
        }
        return false;
    }

    static async addGameToShopCart(game_id: string): Promise<boolean> {
        let { shop_cart_itens } = await prisma.user.findUnique({
            where: {
                id: global.SESSION_USER.id,
            },
            select: {
                shop_cart_itens: true,
            },
        });

        const game = await prisma.game.findUnique({
            where: {
                id: game_id,
            },
            select: {
                id: true,
                image: true,
                title: true,
                price: true,
            },
        });

        if (!shop_cart_itens) {
            const shopCartItens = [];

            shopCartItens.push(game);

            await prisma.user.update({
                where: {
                    id: global.SESSION_USER.id,
                },
                data: {
                    shop_cart_itens: JSON.stringify(shopCartItens),
                },
            });

            return true;
        }

        shop_cart_itens = JSON.parse(shop_cart_itens);

        if (shop_cart_itens.some((game) => game.id === game_id)) {
            const indexToRemove = shop_cart_itens.findIndex(function (game) {
                return game.id === game_id;
            });

            shop_cart_itens.splice(indexToRemove, 1);

            await prisma.user.update({
                where: {
                    id: global.SESSION_USER.id,
                },
                data: {
                    shop_cart_itens: JSON.stringify(shop_cart_itens),
                },
            });

            return false;
        }

        shop_cart_itens.push(game);

        await prisma.user.update({
            where: {
                id: global.SESSION_USER.id,
            },
            data: {
                shop_cart_itens: JSON.stringify(shop_cart_itens),
            },
        });
        return true;
    }

    static async addBookToShopCart(book_id: string): Promise<boolean> {
        let { shop_cart_itens } = await prisma.user.findUnique({
            where: {
                id: global.SESSION_USER.id,
            },
            select: {
                shop_cart_itens: true,
            },
        });

        const book = await prisma.book.findUnique({
            where: {
                id: book_id,
            },
            select: {
                id: true,
                image: true,
                title: true,
                price: true,
            },
        });

        if (!shop_cart_itens) {
            const shopCartItens = [];

            shopCartItens.push(book);

            await prisma.user.update({
                where: {
                    id: global.SESSION_USER.id,
                },
                data: {
                    shop_cart_itens: JSON.stringify(shopCartItens),
                },
            });

            return true;
        }

        shop_cart_itens = JSON.parse(shop_cart_itens);

        if (shop_cart_itens.some((book) => book.id === book_id)) {
            const indexToRemove = shop_cart_itens.findIndex(function (book) {
                return book.id === book_id;
            });

            shop_cart_itens.splice(indexToRemove, 1);

            await prisma.user.update({
                where: {
                    id: global.SESSION_USER.id,
                },
                data: {
                    shop_cart_itens: JSON.stringify(shop_cart_itens),
                },
            });

            return false;
        }

        shop_cart_itens.push(book);

        await prisma.user.update({
            where: {
                id: global.SESSION_USER.id,
            },
            data: {
                shop_cart_itens: JSON.stringify(shop_cart_itens),
            },
        });
        return true;
    }

    static async removeShopCartItem(item_id: string): Promise<boolean> {
        let { shop_cart_itens } = await prisma.user.findUnique({
            where: {
                id: global.SESSION_USER.id,
            },
            select: {
                shop_cart_itens: true,
            },
        });

        shop_cart_itens = JSON.parse(shop_cart_itens);

        if (shop_cart_itens.some((item) => item.id === item_id)) {
            const indexToRemove = shop_cart_itens.findIndex(function (item) {
                return item.id === item_id;
            });

            shop_cart_itens.splice(indexToRemove, 1);

            await prisma.user.update({
                where: {
                    id: global.SESSION_USER.id,
                },
                data: {
                    shop_cart_itens: JSON.stringify(shop_cart_itens),
                },
            });

            return true;
        }

        return false;
    }

    static async getTotalItensShopCart(): Promise<number> {
        if (global.SESSION_USER) {
            let { shop_cart_itens } = await prisma.user.findUnique({
                where: {
                    id: global.SESSION_USER.id,
                },
                select: {
                    shop_cart_itens: true,
                },
            });

            shop_cart_itens = JSON.parse(shop_cart_itens);
            return shop_cart_itens?.length || 0;
        }

        return 0;
    }

    static async getShopCartItens() {
        if (global.SESSION_USER) {
            let { shop_cart_itens } = await prisma.user.findUnique({
                where: {
                    id: global.SESSION_USER.id,
                },
                select: {
                    shop_cart_itens: true,
                },
            });

            shop_cart_itens = JSON.parse(shop_cart_itens);
            if (shop_cart_itens && shop_cart_itens.length > 0) {
                shop_cart_itens.forEach(
                    (item: { price: string | number }) => (item.price = NumberHelper.toFloat(item.price)),
                );
                return shop_cart_itens;
            }
            return null;
        }
        return null;
    }

    static async getShopCartTotalAmount(): Promise<number> {
        if (global.SESSION_USER) {
            let { shop_cart_itens } = await prisma.user.findUnique({
                where: {
                    id: global.SESSION_USER.id,
                },
                select: {
                    shop_cart_itens: true,
                },
            });

            shop_cart_itens = JSON.parse(shop_cart_itens);

            if (shop_cart_itens && shop_cart_itens.length > 0) {
                const shopCartTotalAmount = shop_cart_itens.reduce((sum: number, { price }) => sum + price, 0);

                return NumberHelper.toFloat(shopCartTotalAmount);
            }

            return 0;
        }
        return 0;
    }

    static async removeAllShopCartItens(): Promise<void> {
        await prisma.user.update({
            where: {
                id: global.SESSION_USER.id,
            },
            data: {
                shop_cart_itens: null,
            },
        });
    }
}
