import Link from "next/link";
import type { PublicCategory } from "../../../lib/catalog/types";
import { ArrowIcon } from "./icons";

const categorySymbols = ["✦", "◌", "◇", "○", "✧"];

export function CategoryStrip({ categories, title }: { categories: PublicCategory[]; title: string }) {
  return (
    <section className="modabella-section" aria-labelledby="modabella-categories-title">
      <div className="modabella-section__heading">
        <h2 id="modabella-categories-title">{title}</h2>
        {categories[0] ? <Link href={`/categorias/${categories[0].slug}`}>Ver todas <ArrowIcon /></Link> : null}
      </div>
      {categories.length ? (
        <div className="modabella-categories">
          {categories.map((category, index) => (
            <Link href={`/categorias/${category.slug}`} className="modabella-category" key={category.slug}>
              <span aria-hidden="true">{categorySymbols[index % categorySymbols.length]}</span>
              <strong>{category.name}</strong>
            </Link>
          ))}
        </div>
      ) : <p className="modabella-empty">As categorias serão publicadas em breve.</p>}
    </section>
  );
}
