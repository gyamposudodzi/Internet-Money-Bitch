from __future__ import annotations

from dataclasses import dataclass

from sqlalchemy import bindparam, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.schemas.catalog import ContentFileSummary, MediaDetail, MediaSummary


@dataclass(slots=True)
class CatalogFilters:
    genre: str | None = None
    year: int | None = None
    language: str | None = None
    sort: str = "latest"
    page: int = 1
    limit: int = 24


class CatalogRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def get_home_sections(self) -> dict:
        featured_movies = await self.list_movies(
            CatalogFilters(sort="featured", page=1, limit=12)
        )
        latest_movies = await self.list_movies(
            CatalogFilters(sort="latest", page=1, limit=12)
        )
        featured_audio = await self.list_audio(
            artist=None,
            album=None,
            language=None,
            sort="featured",
            page=1,
            limit=12,
        )
        ad_slots = await self._list_ad_slots()

        return {
            "sections": [
                {"key": "featured-movies", "title": "Featured Movies", "items": featured_movies},
                {"key": "latest-movies", "title": "Latest Movies", "items": latest_movies},
                {"key": "featured-audio", "title": "Featured Audio", "items": featured_audio},
            ],
            "ad_slots": ad_slots,
        }

    async def search(
        self,
        q: str | None,
        content_type: str | None,
        genre: str | None,
        year: int | None,
        language: str | None,
        page: int,
        limit: int,
    ) -> list[dict]:
        params = {
            "q": f"%{q.strip()}%" if q else None,
            "genre": genre,
            "year": year,
            "language": language,
            "limit": limit,
            "offset": self._offset(page, limit),
        }
        content_filter = (content_type or "").lower()

        chunks: list[str] = []
        if content_filter in ("", "movie"):
            chunks.append(
                """
                select
                  m.id::text as id,
                  m.title,
                  m.slug,
                  m.poster_url,
                  m.release_year,
                  'movie' as content_type
                from public.movies m
                where m.publication_status = 'published'
                  and (:q is null or m.title ilike :q or coalesce(m.synopsis, '') ilike :q)
                  and (:year is null or m.release_year = :year)
                  and (:language is null or m.language = :language)
                  and (
                    :genre is null
                    or exists (
                      select 1
                      from public.movie_genres mg
                      join public.genres g on g.id = mg.genre_id
                      where mg.movie_id = m.id and g.slug = :genre
                    )
                  )
                """
            )
        if content_filter in ("", "series"):
            chunks.append(
                """
                select
                  s.id::text as id,
                  s.title,
                  s.slug,
                  s.poster_url,
                  s.release_year,
                  'series' as content_type
                from public.series s
                where s.publication_status = 'published'
                  and (:q is null or s.title ilike :q or coalesce(s.synopsis, '') ilike :q)
                  and (:year is null or s.release_year = :year)
                  and (:language is null or s.language = :language)
                  and (
                    :genre is null
                    or exists (
                      select 1
                      from public.series_genres sg
                      join public.genres g on g.id = sg.genre_id
                      where sg.series_id = s.id and g.slug = :genre
                    )
                  )
                """
            )
        if content_filter in ("", "audio"):
            chunks.append(
                """
                select
                  a.id::text as id,
                  a.title,
                  a.slug,
                  a.cover_url as poster_url,
                  null::integer as release_year,
                  'audio' as content_type
                from public.audio_items a
                where a.publication_status = 'published'
                  and (
                    :q is null
                    or a.title ilike :q
                    or coalesce(a.artist, '') ilike :q
                    or coalesce(a.album, '') ilike :q
                    or coalesce(a.synopsis, '') ilike :q
                  )
                  and (:language is null or a.language = :language)
                """
            )

        if not chunks:
            return []

        query = text(
            " select * from ("
            + " union all ".join(chunks)
            + ") search_results order by title asc limit :limit offset :offset "
        )
        result = await self.session.execute(query, params)
        return [dict(row) for row in result.mappings().all()]

    async def list_movies(self, filters: CatalogFilters) -> list[dict]:
        query = text(
            f"""
            select
              m.id::text as id,
              m.title,
              m.slug,
              m.poster_url,
              m.release_year,
              'movie' as content_type
            from public.movies m
            where m.publication_status = 'published'
              and (:year is null or m.release_year = :year)
              and (:language is null or m.language = :language)
              and (
                :genre is null
                or exists (
                  select 1
                  from public.movie_genres mg
                  join public.genres g on g.id = mg.genre_id
                  where mg.movie_id = m.id and g.slug = :genre
                )
              )
            order by {self._movie_sort_clause(filters.sort)}
            limit :limit offset :offset
            """
        )
        result = await self.session.execute(
            query,
            {
                "genre": filters.genre,
                "year": filters.year,
                "language": filters.language,
                "limit": filters.limit,
                "offset": self._offset(filters.page, filters.limit),
            },
        )
        return [dict(row) for row in result.mappings().all()]

    async def get_movie(self, slug: str) -> dict | None:
        query = text(
            """
            select
              m.id::text as id,
              m.title,
              m.slug,
              m.poster_url,
              m.backdrop_url,
              m.synopsis,
              m.release_year,
              m.language,
              'movie' as content_type
            from public.movies m
            where m.slug = :slug and m.publication_status = 'published'
            limit 1
            """
        )
        result = await self.session.execute(query, {"slug": slug})
        movie = result.mappings().first()
        if not movie:
            return None

        movie_dict = dict(movie)
        movie_dict["files"] = await self._list_content_files("movie", movie_dict["id"])
        return movie_dict

    async def list_series(self, page: int, limit: int) -> list[dict]:
        query = text(
            """
            select
              s.id::text as id,
              s.title,
              s.slug,
              s.poster_url,
              s.release_year,
              'series' as content_type
            from public.series s
            where s.publication_status = 'published'
            order by coalesce(s.featured_rank, 999999) asc, coalesce(s.published_at, s.created_at) desc
            limit :limit offset :offset
            """
        )
        result = await self.session.execute(
            query,
            {"limit": limit, "offset": self._offset(page, limit)},
        )
        return [dict(row) for row in result.mappings().all()]

    async def get_series(self, slug: str) -> dict | None:
        query = text(
            """
            select
              s.id::text as id,
              s.title,
              s.slug,
              s.poster_url,
              s.backdrop_url,
              s.synopsis,
              s.release_year,
              s.language,
              'series' as content_type
            from public.series s
            where s.slug = :slug and s.publication_status = 'published'
            limit 1
            """
        )
        result = await self.session.execute(query, {"slug": slug})
        series_row = result.mappings().first()
        if not series_row:
            return None

        return dict(series_row)

    async def list_audio(
        self,
        artist: str | None,
        album: str | None,
        language: str | None,
        sort: str,
        page: int,
        limit: int,
    ) -> list[dict]:
        query = text(
            f"""
            select
              a.id::text as id,
              a.title,
              a.slug,
              a.cover_url as poster_url,
              null::integer as release_year,
              'audio' as content_type
            from public.audio_items a
            where a.publication_status = 'published'
              and (:artist is null or a.artist = :artist)
              and (:album is null or a.album = :album)
              and (:language is null or a.language = :language)
            order by {self._audio_sort_clause(sort)}
            limit :limit offset :offset
            """
        )
        result = await self.session.execute(
            query,
            {
                "artist": artist,
                "album": album,
                "language": language,
                "limit": limit,
                "offset": self._offset(page, limit),
            },
        )
        return [dict(row) for row in result.mappings().all()]

    async def get_audio(self, slug: str) -> dict | None:
        query = text(
            """
            select
              a.id::text as id,
              a.title,
              a.slug,
              a.cover_url as poster_url,
              null::text as backdrop_url,
              a.synopsis,
              null::integer as release_year,
              a.language,
              'audio' as content_type
            from public.audio_items a
            where a.slug = :slug and a.publication_status = 'published'
            limit 1
            """
        )
        result = await self.session.execute(query, {"slug": slug})
        audio = result.mappings().first()
        if not audio:
            return None

        audio_dict = dict(audio)
        audio_dict["files"] = await self._list_content_files("audio", audio_dict["id"])
        return audio_dict

    async def _list_content_files(self, content_kind: str, content_id: str) -> list[dict]:
        query = text(
            """
            select
              cf.id::text as id,
              cf.label,
              cf.quality,
              cf.format,
              cf.file_size_bytes,
              cf.requires_ad,
              cf.points_cost
            from public.content_files cf
            where cf.content_kind = :content_kind
              and cf.content_id = :content_id::uuid
              and cf.is_active = true
            order by coalesce(cf.quality, ''), coalesce(cf.format, '')
            """
        )
        result = await self.session.execute(
            query,
            {"content_kind": content_kind, "content_id": content_id},
        )
        return [dict(row) for row in result.mappings().all()]

    async def _list_ad_slots(self) -> list[dict]:
        query = text(
            """
            select
              key,
              title,
              location,
              config
            from public.ad_slots
            where is_active = true
            order by title asc
            limit 10
            """
        )
        result = await self.session.execute(query)
        return [dict(row) for row in result.mappings().all()]

    @staticmethod
    def _offset(page: int, limit: int) -> int:
        safe_page = max(page, 1)
        safe_limit = max(min(limit, 100), 1)
        return (safe_page - 1) * safe_limit

    @staticmethod
    def _movie_sort_clause(sort: str) -> str:
        sort_map = {
            "featured": "coalesce(m.featured_rank, 999999) asc, coalesce(m.published_at, m.created_at) desc",
            "popular": "coalesce(m.imdb_rating, 0) desc, coalesce(m.published_at, m.created_at) desc",
            "latest": "coalesce(m.published_at, m.created_at) desc",
        }
        return sort_map.get(sort, sort_map["latest"])

    @staticmethod
    def _audio_sort_clause(sort: str) -> str:
        sort_map = {
            "featured": "coalesce(a.featured_rank, 999999) asc, coalesce(a.published_at, a.created_at) desc",
            "latest": "coalesce(a.published_at, a.created_at) desc",
            "title": "a.title asc",
        }
        return sort_map.get(sort, sort_map["latest"])


def as_media_summaries(rows: list[dict]) -> list[MediaSummary]:
    return [MediaSummary.model_validate(row) for row in rows]


def as_media_detail(row: dict) -> MediaDetail:
    files = [ContentFileSummary.model_validate(file_row) for file_row in row.pop("files", [])]
    detail = MediaDetail.model_validate(row)
    detail.files = files
    return detail
