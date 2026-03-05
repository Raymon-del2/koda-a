"use client";

import { collection, getDocs, query, orderBy, limit, Timestamp } from "firebase/firestore";
import { bxarchiDb } from "./firebase";

export interface Book {
  id: string;
  title: string;
  authorId?: string;
  authorName?: string;
  description?: string;
  coverImage?: string; // base64
  backCoverImage?: string;
  content?: string;
  genre?: string;
  likes?: number;
  dislikes?: number;
  views?: number;
  published?: boolean;
  createdAt?: number | Timestamp;
  updatedAt?: number | Timestamp;
}

// Fetch books from Bxarchi Firebase
export const fetchBxarchiBooks = async (): Promise<Book[]> => {
  try {
    // Try common collection names
    const possibleCollections = ['books', 'library', 'pdfs', 'documents', 'uploads'];
    let books: Book[] = [];

    for (const collName of possibleCollections) {
      try {
        const booksRef = collection(bxarchiDb, collName);
        // Try without orderBy first to avoid issues with missing fields
        const q = query(booksRef, limit(100));
        const snapshot = await getDocs(q);

        if (!snapshot.empty) {
          const fetchedBooks = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as Book[];
          
          books = [...books, ...fetchedBooks];
          console.log(`✓ Found ${fetchedBooks.length} books in '${collName}' collection`);
        }
      } catch (err) {
        console.warn(`Could not fetch from '${collName}':`, err);
        continue;
      }
    }

    // Remove duplicates by id
    const uniqueBooks = books.filter((book, index, self) => 
      index === self.findIndex(b => b.id === book.id)
    );

    console.log(`✓ Total unique books fetched: ${uniqueBooks.length}`);
    if (uniqueBooks.length > 0) {
      console.log('First book:', uniqueBooks[0]);
    }
    return uniqueBooks;
  } catch (error) {
    console.error("Error fetching Bxarchi books:", error);
    return [];
  }
};

// Get books by genre
export const getBooksByGenre = (books: Book[], genre: string): Book[] => {
  return books.filter(book => 
    book.genre?.toLowerCase() === genre.toLowerCase()
  );
};

export const searchBooks = (books: Book[], query: string): Book[] => {
  const lowerQuery = query.toLowerCase();
  return books.filter(book => 
    book.title?.toLowerCase().includes(lowerQuery) ||
    book.authorName?.toLowerCase().includes(lowerQuery) ||
    book.description?.toLowerCase().includes(lowerQuery) ||
    book.genre?.toLowerCase().includes(lowerQuery)
  );
};
