import { Request, Response } from "express";

import Header from "../../utils/Header";
import Books from "../../repositories/books.repository";
import Games from "../../repositories/games.repository";
import Movies from "../../repositories/movies.repository";
import TVShows from "../../repositories/tv-shows.repository";

export default class TVShowsController {
	static async getViewTVShows(req: Request, res: Response) {
		const tvshow = await TVShows.getRandom();
		const totalGames = await Games.getTotal();
		const totalBooks = await Books.getTotal();
		const totalMovies = await Movies.getTotal();
		const totalTVShows = await TVShows.getTotal();

		return res.render("pages/tvshows", {
			flash_success: req.flash("success"),
			flash_warning: req.flash("warning"),
			tvshow,
			totalGames,
			totalBooks,
			totalMovies,
			totalTVShows,
			user: global.SESSION_USER,
			app_url: process.env.APP_URL,
			header: Header.books(),
		});
	}

	static async getSearchTVShowTitle(req: Request, res: Response) {
		const searchTVShowTitle = req.query.title;

		if (!searchTVShowTitle) {
			return res.redirect("/");
		}

		const searchTVShows = await TVShows.searchTitle(searchTVShowTitle as string);

		if (!searchTVShows.length) {
			req.flash("warning", `No tvshows found from search: ${searchTVShowTitle}! Recommending a Random TVShow`);
			return res.redirect("/");
		}

		if (searchTVShows.length > 1) {
			searchTVShows[0].firstTVShow = true;
			return res.render("pages/tvshows", {
				flash_success: `${searchTVShows.length
					} TVShows Found From Search Title: ${searchTVShowTitle.toUpperCase()}`,
				tvshows: searchTVShows,
				user: global.SESSION_USER,
				header: Header.tvshows(),
			});
		}

		return res.render("pages/tvshows", {
			flash_success: `1 TVShow Found From Search Title: ${searchTVShowTitle.toUpperCase()}`,
			tvshow: searchTVShows[0],
			user: global.SESSION_USER,
			header: Header.tvshows(),
		});
	}
}
