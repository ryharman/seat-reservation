import "reflect-metadata";
import { Reservation } from "../entity/Reservation";
import { Arg, Mutation, Query, Resolver, UseMiddleware } from "type-graphql";
import { isAuth } from "./middleware/isAuth";
import { CreateReservationInput, UpdateReservationInput } from "./reservation/ReservationInput";
import { ObjectLiteral } from "typeorm";
import { isSeatBooked } from "./reservation/isSeatBooked";

@Resolver()
export class ReservationResolver {
  @UseMiddleware(isAuth)
  @Query(() => Reservation)
  async reservationById(@Arg("id") id: number): Promise<Reservation | null> {
    const reservation = await Reservation.findOne(id);

    if (!reservation) {
      return null;
    }

    return reservation;
  }

  @UseMiddleware(isAuth)
  @Query(() => [Reservation])
  async reservations(): Promise<Reservation[] | null> {
    const reservations = await Reservation.find();

    if (!reservations) {
      return null;
    }

    return reservations;
  }

  @UseMiddleware(isAuth)
  @Query(() => [Reservation])
  async reservationByType(@Arg("type") type: string): Promise<Reservation[] | null> {
    const reservations = await Reservation.find({ bookingType: type });

    const alternate = await Reservation.createQueryBuilder().innerJoinAndSelect("reservation.bookedItemId", "");
    console.log(alternate, " log of alternate solution?");

    if (!reservations) {
      return null;
    }

    return reservations;
  }

  @UseMiddleware(isAuth)
  @Query(() => [Reservation])
  async reservationByItem(@Arg("id") id: number): Promise<Reservation[] | null> {
    const reservations = await Reservation.find({ bookedItemId: id });

    if (!reservations) {
      return null;
    }

    return reservations;
  }

  @UseMiddleware(isAuth)
  @Query(() => [Reservation])
  async reservationsFromDate(
    @Arg("type") type: string,
    @Arg("dateFrom") dateFrom: Date,
    @Arg("dateTo", { defaultValue: new Date() }) dateTo: Date
  ): Promise<Reservation[] | null> {
    const reservations = await Reservation.find({
      bookingType: type,
      dateBookedFrom: dateFrom,
      dateBookedTo: dateTo,
    });

    if (!reservations) {
      return null;
    }

    return reservations;
  }

  // TODO: Finish middleware to check if the reservation is actually possible.
  // This will be on top of the frontend validation/restrictions
  @UseMiddleware(isAuth, isSeatBooked)
  @Mutation(() => Reservation)
  async createReservation(
    @Arg("data", () => CreateReservationInput)
    { userId, bookedItemId, bookingType, dateBookedFrom, dateBookedTo }: CreateReservationInput
  ): Promise<Reservation> {
    const reservation = await Reservation.createQueryBuilder()
      .insert()
      .values({
        userId,
        bookedItemId,
        bookingType,
        cancelled: false,
        dateBookedFrom,
        dateBookedTo,
      })
      .returning("*")
      .execute()
      .then((response) => {
        return response.raw[0];
      });

    return reservation;
  }

  @Mutation(() => [Reservation])
  async createReservations(
    @Arg("data", () => [CreateReservationInput]) data: CreateReservationInput[]
  ): Promise<ObjectLiteral[]> {
    console.log(data);
    console.log("#####################");
    console.log(data.map((r) => console.log(r, " logging map data")));
    /* Need to test if this actually works and whether it actually returns the ID's! */
    const reservations = await Reservation.createQueryBuilder()
      .insert()
      .values(
        data.map((r) => {
          return { ...r };
        })
      )
      .returning("*")
      .execute()
      .then((response) => {
        return response.raw[0];
      });

    return reservations;
  }

  @UseMiddleware(isAuth, isSeatBooked)
  @Mutation(() => Reservation)
  async updateReservation(
    @Arg("data", () => UpdateReservationInput)
    data: UpdateReservationInput
  ): Promise<Reservation> {
    const reservation = await Reservation.createQueryBuilder()
      .update()
      .set({ ...data })
      .where("id = :id", { id: data.id })
      .returning("*")
      .execute()
      .then((response) => {
        return response.raw[0];
      });

    return reservation;
  }
}
